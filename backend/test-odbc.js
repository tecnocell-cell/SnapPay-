import sql from "msnodesqlv8";

const conn =
  "Driver={ODBC Driver 17 for SQL Server};Server=localhost\\SQLEXPRESS;Database=EasySAC_PDV;Trusted_Connection=Yes;";

sql.open(conn, (err, conn2) => {
  if (err) {
    console.error("ERRO:", JSON.stringify(err, null, 2));
    process.exit(1);
  }
  console.log("Conectado!");
  process.exit(0);
});
