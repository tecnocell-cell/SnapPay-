import sql from "mssql/msnodesqlv8.js";
import "dotenv/config";

const config = {
  connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${process.env.DB_SERVER};Database=${process.env.DB_DATABASE};Trusted_Connection=Yes;`,
};

export const poolPromise = sql.connect(config);
export { sql };
