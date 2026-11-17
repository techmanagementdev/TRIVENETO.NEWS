// Dati dell'editore: letti dalle variabili d'ambiente, mai inventati.
export default function PublisherInfo() {
  const info = process.env.PUBLISHER_INFO?.trim();
  if (!info) {
    return <p className="notice">I dati dell'editore, del direttore responsabile e dell'eventuale registrazione della testata sono in corso di definizione e saranno pubblicati qui.</p>;
  }
  return <div>{info.split("\n").map((l, i) => <p key={i} style={{ margin: "4px 0" }}>{l}</p>)}</div>;
}
