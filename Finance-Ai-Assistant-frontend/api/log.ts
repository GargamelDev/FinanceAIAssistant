import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { level, message, data } = req.body;

    // This will appear in Vercel function logs
    console.log(
      `[${level.toUpperCase()}] ${new Date().toISOString()} - ${message}`
    );
    if (data) {
      console.log("Data:", JSON.stringify(data, null, 2));
    }

    res.status(200).json({ logged: true });
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
