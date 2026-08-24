export function DataRequired({ detail }: { detail?: string }) {
  return (
    <div className="card data-required">
      <div className="headline">DATA CONNECTION REQUIRED</div>
      <div>
        {detail ?? "Connect a real market-data provider in Settings to begin analysis. BOP never substitutes fabricated prices or signals."}
      </div>
    </div>
  );
}
