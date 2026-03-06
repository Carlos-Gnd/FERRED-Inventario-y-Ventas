import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Falta variable de entorno: ${name}`);
  return val;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),

  db: {
    host: required("DB_HOST"),
    user: required("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    database: required("DB_NAME"),
    port: Number(process.env.DB_PORT ?? 3306),
  },

  bcrypt: {
    saltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
  },
};