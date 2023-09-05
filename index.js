import express from "express";
import pg from "pg";
import { nanoid as nano } from "nanoid";
const { Pool } = pg;

const BASE_URL = `http://localhost:8888`;
const supabase = `postgresql://postgres:1QwSdXc.fre32@db.bnyinsmxhhxifwzjcwua.supabase.co:5432/postgres`;
const db = new Pool({ connectionString: supabase });

// We need two routes
// 1 route where user sends us a valid url address
// if the url is perfectly fine, we shortcode it and pass the new url to the user via response
// 2nd route will be where the user actually accesses that url
// and gets redirected to the correct location

const app = express();

app.use(express.json());

app.get("/:shortCode", async (req, res) => {
  const { shortCode } = req.params;
  try {
    const ifExists = await db.query(`SELECT * FROM urls WHERE shortcode = $1`, [
      shortCode,
    ]);
    if (ifExists.rowCount < 1) {
      return res
        .status(500)
        .send({
          msg: `No such shorturl exists in the database. Maybe you should create one first?`,
        });
    }

    return res.redirect(ifExists.rows[0].url);
  } catch (error) {
    if (error) {
      return res.status(500).send({ error: error });
    }
  }
});

app.post("/", async (req, res) => {
  try {
    const url = req.body.url?.trim();
    if (!url) {
      return res.status(500).send({ error: `Url required in request body` });
    }

    const checkUrl = new URL(url);

    const ifExists = await db.query(`SELECT * FROM urls WHERE url = $1`, [url]);
    if (ifExists.rowCount > 0) {
      const shortUrl = `${BASE_URL}/${ifExists.rows[0].shortcode}`;

      return res
        .status(200)
        .send({ data: ifExists.rows[0], msg: `Already exists`, shortUrl });
    }

    const shortCode = nano();
    const shortUrl = `${BASE_URL}/${shortCode}`;
    const addToDb = await db.query(
      `INSERT INTO urls(shortcode, url) VALUES($1, $2) RETURNING *`,
      [shortCode, url]
    );
    if (addToDb.rowCount > 0) {
      return res
        .status(200)
        .send({ data: addToDb.rows[0], msg: `Created`, shortUrl });
    }

    return res.json({ checkUrl });
  } catch (error) {
    if (error) {
      if (error.code === "ERR_INVALID_URL") {
        return res.status(500).json({
          error: `Provided URL is of wrong format. Required format must be of type: http://www.localhost.com/some/path/to`,
        });
      }
      return res.status(500).json({ error: error });
    }
  }
});

app.listen(8888, (err) => {
  if (err) throw new Error(err);
  console.log(`Running on http://localhost:8888`);
});
