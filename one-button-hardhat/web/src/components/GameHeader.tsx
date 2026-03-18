"use client";

import ConnectWalletButton from "./ConnectWalletButton";

type GameHeaderProps = {
  onOpenInstructions: () => void;
};

export default function GameHeader({ onOpenInstructions }: GameHeaderProps) {
  return (
    <header className="game-header">
      <div className="game-header-copy">
        <h1>One Button</h1>
        <p>Last presser wins the pot.</p>
      </div>

      <div className="game-header-actions">
        <button onClick={onOpenInstructions} className="ghost-button">
          How It Works
        </button>

        <ConnectWalletButton />
      </div>
    </header>
  );
}
