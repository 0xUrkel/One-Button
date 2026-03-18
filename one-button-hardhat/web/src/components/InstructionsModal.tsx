"use client";

type InstructionsModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function InstructionsModal({
  open,
  onClose,
}: InstructionsModalProps) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 720,
          maxHeight: "85vh",
          overflowY: "auto",
          background: "#111214",
          border: "1px solid #26272b",
          borderRadius: 20,
          padding: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>How One Button Works</h2>
            <p style={{ margin: "8px 0 0", opacity: 0.75, lineHeight: 1.5 }}>
              Last person to press before the timer hits zero wins the round.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "white",
              border: "1px solid #333",
              padding: "8px 12px",
              borderRadius: 10,
            }}
          >
            Close
          </button>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <Section title="Core idea">
            <p style={p}>
              Every press adds AVAX to the pot and updates the round timer. When
              the timer reaches zero, the last presser wins.
            </p>
          </Section>

          <Section title="Round timer">
            <ul style={list}>
              <li>Each round starts with a 12 hour timer.</li>
              <li>
                If there is more than 1 hour left, a press resets it to 12
                hours.
              </li>
              <li>
                If there is less than 1 hour left, a press adds 10 minutes.
              </li>
              <li>
                If there are less than 10 minutes left, a press adds 30 seconds.
              </li>
            </ul>
          </Section>

          <Section title="Press cost">
            <p style={p}>
              Your first press costs <strong>0.1 AVAX</strong>. Each additional
              press from the same wallet gets more expensive.
            </p>
            <ul style={list}>
              <li>1st press: 0.10 AVAX</li>
              <li>2nd press: 0.135 AVAX</li>
              <li>3rd press: 0.18225 AVAX</li>
              <li>4th press: 0.246 AVAX</li>
            </ul>
          </Section>

          <Section title="Cooldown">
            <p style={p}>
              The same wallet must wait <strong>10 seconds</strong> before
              pressing again.
            </p>
          </Section>

          <Section title="Payouts">
            <ul style={list}>
              <li>
                <strong>80%</strong> goes to the winner.
              </li>
              <li>
                <strong>10%</strong> goes to the dividend pool.
              </li>
              <li>
                <strong>10%</strong> goes to the treasury.
              </li>
            </ul>
          </Section>

          <Section title="Dividends">
            <p style={p}>
              Players who contributed to the round can claim part of the
              dividend pool. Your share is based on how much AVAX you
              contributed relative to the total pot.
            </p>
          </Section>

          <Section title="Empty rounds">
            <p style={p}>
              If nobody presses and the timer expires, the round can be rolled
              forward safely.
            </p>
          </Section>

          <Section title="What you need to do">
            <ol style={list}>
              <li>Connect your wallet on Avalanche</li>
              <li>Watch the current timer and pot.</li>
              <li>Press the button if you want to become the leader.</li>
              <li>Come back before the timer ends to defend your spot.</li>
              <li>If you contributed, claim your dividend after settlement.</li>
            </ol>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid #232428",
        borderRadius: 16,
        padding: 16,
        background: "#0d0e10",
      }}
    >
      <div
        style={{
          fontSize: 13,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          opacity: 0.7,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </section>
  );
}

const p: React.CSSProperties = {
  margin: 0,
  opacity: 0.9,
  lineHeight: 1.6,
};

const list: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  lineHeight: 1.7,
  opacity: 0.92,
};
