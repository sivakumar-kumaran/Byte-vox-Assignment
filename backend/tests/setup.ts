import 'dotenv/config';
// Use the real DATABASE_URL or a separate test DB if TEST_DATABASE_URL is set
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
