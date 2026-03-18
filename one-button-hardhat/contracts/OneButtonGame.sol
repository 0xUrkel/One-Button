// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract OneButtonGame is Ownable, ReentrancyGuard, Pausable {
    uint256 public constant BASE_COST = 0.1 ether;
    uint256 public constant COST_MULTIPLIER_BPS = 13500; // 1.35x
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Launch-friendly timing defaults
    uint256 public fullResetDuration = 3 minutes;
    uint256 public latePhaseThreshold = 60 seconds;
    uint256 public suddenDeathThreshold = 15 seconds;
    uint256 public latePhaseExtension = 30 seconds;
    uint256 public suddenDeathExtension = 10 seconds;

    uint256 public constant WINNER_BPS = 8000;
    uint256 public constant DIVIDEND_BPS = 1000;
    uint256 public constant TREASURY_BPS = 1000;

    uint256 public constant SAME_WALLET_COOLDOWN = 10 seconds;
    uint256 public constant SEASON_DURATION = 14 days;

    struct Round {
        uint256 id;
        uint256 seasonId;
        uint64 startTime;
        uint64 endTime;
        uint256 totalPot;
        uint256 winnerPayout;
        uint256 dividendPool;
        uint256 treasuryAmount;
        uint32 totalPresses;
        uint32 uniquePlayers;
        address lastPresser;
        bool settled;
    }

    struct Season {
        uint256 id;
        uint64 startTime;
        uint64 endTime;
        uint32 totalRounds;
        uint256 totalPot;
        uint256 totalWinnerPayouts;
        uint256 totalDividendPools;
        uint256 totalTreasuryAmount;
        uint32 totalPresses;
        uint32 totalUniquePlayers;
        bool finalized;
    }

    mapping(uint256 => Round) public rounds;
    mapping(uint256 => Season) public seasons;

    mapping(uint256 => mapping(address => uint32)) public playerPressCount;
    mapping(uint256 => mapping(address => uint256)) public playerContribution;
    mapping(uint256 => mapping(address => uint64)) public playerLastPressAt;
    mapping(uint256 => mapping(address => bool)) public roundHasParticipated;
    mapping(uint256 => mapping(address => bool)) public dividendClaimed;

    uint256 public currentRoundId;
    uint256 public currentSeasonId;
    address public treasury;

    event RoundStarted(
        uint256 indexed roundId,
        uint256 indexed seasonId,
        uint64 startTime,
        uint64 endTime
    );

    event ButtonPressed(
        uint256 indexed roundId,
        uint256 indexed seasonId,
        address indexed player,
        uint32 pressCountForPlayer,
        uint256 amountPaid,
        uint256 totalPot,
        uint64 previousEndTime,
        uint64 newEndTime,
        address newLeader
    );

    event RoundSettled(
        uint256 indexed roundId,
        uint256 indexed seasonId,
        address indexed winner,
        uint256 totalPot,
        uint256 winnerPayout,
        uint256 dividendPool,
        uint256 treasuryAmount,
        uint64 settledAt
    );

    event DividendClaimed(
        uint256 indexed roundId,
        address indexed player,
        uint256 amount
    );

    event SeasonStarted(
        uint256 indexed seasonId,
        uint64 startTime,
        uint64 endTime
    );

    event SeasonFinalized(
        uint256 indexed seasonId,
        uint32 totalRounds,
        uint256 totalPot,
        uint32 totalPresses
    );

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    event RoundRolledWithoutPresses(
        uint256 indexed expiredRoundId,
        uint256 indexed newRoundId,
        uint256 indexed seasonId
    );

    event TimingConfigUpdated(
        uint256 fullResetDuration,
        uint256 latePhaseThreshold,
        uint256 suddenDeathThreshold,
        uint256 latePhaseExtension,
        uint256 suddenDeathExtension
    );

    constructor(address initialTreasury) Ownable(msg.sender) {
        require(initialTreasury != address(0), "invalid treasury");
        treasury = initialTreasury;

        _startSeason();
        _startRound();
    }

    function press() external payable nonReentrant whenNotPaused {
        Round storage currentRound = rounds[currentRoundId];

        // If the round is expired, automatically move the game forward first.
        if (block.timestamp >= currentRound.endTime && !currentRound.settled) {
            if (currentRound.lastPresser != address(0)) {
                _settleCurrentRound();
            } else {
                _rollExpiredRoundWithoutPresses();
            }
        }

        _executePress(msg.sender, msg.value);
    }

    function settleRound() external nonReentrant whenNotPaused {
        Round storage round = rounds[currentRoundId];

        require(!round.settled, "already settled");
        require(round.lastPresser != address(0), "no presses yet");
        require(block.timestamp >= round.endTime, "round not ended");

        _settleCurrentRound();
    }

    function claimDividend(uint256 roundId) external nonReentrant whenNotPaused {
        Round storage round = rounds[roundId];

        require(round.settled, "round not settled");
        require(!dividendClaimed[roundId][msg.sender], "already claimed");

        uint256 contributed = playerContribution[roundId][msg.sender];
        require(contributed > 0, "no contribution");
        require(round.totalPot > 0, "empty round");

        uint256 amount = (round.dividendPool * contributed) / round.totalPot;
        require(amount > 0, "nothing claimable");

        dividendClaimed[roundId][msg.sender] = true;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "claim transfer failed");

        emit DividendClaimed(roundId, msg.sender, amount);
    }

    function rollRoundIfExpiredWithoutPresses() external nonReentrant whenNotPaused {
        Round storage round = rounds[currentRoundId];

        require(!round.settled, "round settled");
        require(round.lastPresser == address(0), "round has presses");
        require(block.timestamp >= round.endTime, "round not expired");

        _rollExpiredRoundWithoutPresses();
    }

    function getPressCost(uint256 roundId, address player) public view returns (uint256 cost) {
        uint32 count = playerPressCount[roundId][player];
        cost = BASE_COST;

        for (uint32 i = 0; i < count; i++) {
            cost = (cost * COST_MULTIPLIER_BPS) / BPS_DENOMINATOR;
        }
    }

    function getCurrentPressCost(address player) external view returns (uint256) {
        return getPressCost(currentRoundId, player);
    }

    function getTimeRemaining() external view returns (uint256) {
        Round storage round = rounds[currentRoundId];
        if (block.timestamp >= round.endTime) return 0;
        return round.endTime - block.timestamp;
    }

    function getCurrentPhase() external view returns (string memory) {
        Round storage round = rounds[currentRoundId];
        if (block.timestamp >= round.endTime) return "expired";

        uint256 remaining = round.endTime - block.timestamp;

        if (remaining > latePhaseThreshold) {
            return "normal";
        } else if (remaining > suddenDeathThreshold) {
            return "late";
        } else {
            return "sudden_death";
        }
    }

    function setTimingConfig(
        uint256 newFullResetDuration,
        uint256 newLatePhaseThreshold,
        uint256 newSuddenDeathThreshold,
        uint256 newLatePhaseExtension,
        uint256 newSuddenDeathExtension
    ) external onlyOwner {
        require(newFullResetDuration >= 30 seconds, "reset too short");
        require(newFullResetDuration <= 12 hours, "reset too long");
        require(newLatePhaseThreshold > newSuddenDeathThreshold, "bad thresholds");
        require(newLatePhaseThreshold < newFullResetDuration, "late >= reset");
        require(newSuddenDeathThreshold > 0, "bad sudden death");
        require(newLatePhaseExtension > 0, "bad late extension");
        require(newSuddenDeathExtension > 0, "bad sudden extension");

        fullResetDuration = newFullResetDuration;
        latePhaseThreshold = newLatePhaseThreshold;
        suddenDeathThreshold = newSuddenDeathThreshold;
        latePhaseExtension = newLatePhaseExtension;
        suddenDeathExtension = newSuddenDeathExtension;

        emit TimingConfigUpdated(
            fullResetDuration,
            latePhaseThreshold,
            suddenDeathThreshold,
            latePhaseExtension,
            suddenDeathExtension
        );
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "invalid treasury");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _executePress(address player, uint256 amount) internal {
        Round storage round = rounds[currentRoundId];

        require(!round.settled, "round settled");
        require(block.timestamp < round.endTime, "round expired");
        require(
            playerLastPressAt[currentRoundId][player] == 0 ||
                block.timestamp >=
                playerLastPressAt[currentRoundId][player] + SAME_WALLET_COOLDOWN,
            "cooldown active"
        );

        uint256 requiredCost = getPressCost(currentRoundId, player);
        require(amount == requiredCost, "incorrect payment");

        uint64 previousEndTime = round.endTime;
        uint256 remaining = previousEndTime > block.timestamp
            ? previousEndTime - block.timestamp
            : 0;

        if (!roundHasParticipated[currentRoundId][player]) {
            roundHasParticipated[currentRoundId][player] = true;
            round.uniquePlayers += 1;
        }

        playerPressCount[currentRoundId][player] += 1;
        playerContribution[currentRoundId][player] += amount;
        playerLastPressAt[currentRoundId][player] = uint64(block.timestamp);

        round.totalPresses += 1;
        round.totalPot += amount;
        round.lastPresser = player;

        if (remaining > latePhaseThreshold) {
            round.endTime = uint64(block.timestamp + fullResetDuration);
        } else if (remaining > suddenDeathThreshold) {
            round.endTime = uint64(previousEndTime + latePhaseExtension);
        } else {
            round.endTime = uint64(previousEndTime + suddenDeathExtension);
        }

        emit ButtonPressed(
            currentRoundId,
            currentSeasonId,
            player,
            playerPressCount[currentRoundId][player],
            amount,
            round.totalPot,
            previousEndTime,
            round.endTime,
            player
        );
    }

    function _settleCurrentRound() internal {
        Round storage round = rounds[currentRoundId];

        require(!round.settled, "already settled");
        require(round.lastPresser != address(0), "no presses yet");
        require(block.timestamp >= round.endTime, "round not ended");

        uint256 settledRoundId = currentRoundId;
        uint256 settledSeasonId = currentSeasonId;
        address winner = round.lastPresser;
        uint256 totalPot = round.totalPot;

        uint256 winnerPayout = (totalPot * WINNER_BPS) / BPS_DENOMINATOR;
        uint256 dividendPool = (totalPot * DIVIDEND_BPS) / BPS_DENOMINATOR;
        uint256 treasuryAmount = totalPot - winnerPayout - dividendPool;

        round.winnerPayout = winnerPayout;
        round.dividendPool = dividendPool;
        round.treasuryAmount = treasuryAmount;
        round.settled = true;

        Season storage season = seasons[currentSeasonId];
        season.totalRounds += 1;
        season.totalPot += totalPot;
        season.totalWinnerPayouts += winnerPayout;
        season.totalDividendPools += dividendPool;
        season.totalTreasuryAmount += treasuryAmount;
        season.totalPresses += round.totalPresses;
        season.totalUniquePlayers += round.uniquePlayers;

        (bool treasuryOk, ) = payable(treasury).call{value: treasuryAmount}("");
        require(treasuryOk, "treasury transfer failed");

        (bool winnerOk, ) = payable(winner).call{value: winnerPayout}("");
        require(winnerOk, "winner transfer failed");

        emit RoundSettled(
            settledRoundId,
            settledSeasonId,
            winner,
            totalPot,
            winnerPayout,
            dividendPool,
            treasuryAmount,
            uint64(block.timestamp)
        );

        if (block.timestamp >= seasons[currentSeasonId].endTime) {
            _finalizeSeason(currentSeasonId);
            _startSeason();
        }

        _startRound();
    }

    function _rollExpiredRoundWithoutPresses() internal {
        Round storage round = rounds[currentRoundId];

        require(!round.settled, "round settled");
        require(round.lastPresser == address(0), "round has presses");
        require(block.timestamp >= round.endTime, "round not expired");

        uint256 expiredRoundId = currentRoundId;
        uint256 seasonId = currentSeasonId;

        round.settled = true;

        if (block.timestamp >= seasons[currentSeasonId].endTime) {
            _finalizeSeason(currentSeasonId);
            _startSeason();
        }

        _startRound();

        emit RoundRolledWithoutPresses(expiredRoundId, currentRoundId, seasonId);
    }

    function _startSeason() internal {
        currentSeasonId += 1;

        seasons[currentSeasonId] = Season({
            id: currentSeasonId,
            startTime: uint64(block.timestamp),
            endTime: uint64(block.timestamp + SEASON_DURATION),
            totalRounds: 0,
            totalPot: 0,
            totalWinnerPayouts: 0,
            totalDividendPools: 0,
            totalTreasuryAmount: 0,
            totalPresses: 0,
            totalUniquePlayers: 0,
            finalized: false
        });

        emit SeasonStarted(
            currentSeasonId,
            seasons[currentSeasonId].startTime,
            seasons[currentSeasonId].endTime
        );
    }

    function _finalizeSeason(uint256 seasonId) internal {
        Season storage season = seasons[seasonId];
        season.finalized = true;

        emit SeasonFinalized(
            seasonId,
            season.totalRounds,
            season.totalPot,
            season.totalPresses
        );
    }

    function _startRound() internal {
        currentRoundId += 1;

        rounds[currentRoundId] = Round({
            id: currentRoundId,
            seasonId: currentSeasonId,
            startTime: uint64(block.timestamp),
            endTime: uint64(block.timestamp + fullResetDuration),
            totalPot: 0,
            winnerPayout: 0,
            dividendPool: 0,
            treasuryAmount: 0,
            totalPresses: 0,
            uniquePlayers: 0,
            lastPresser: address(0),
            settled: false
        });

        emit RoundStarted(
            currentRoundId,
            currentSeasonId,
            rounds[currentRoundId].startTime,
            rounds[currentRoundId].endTime
        );
    }

    receive() external payable {
        revert("use press");
    }
}