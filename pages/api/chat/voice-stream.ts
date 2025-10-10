import type { NextApiRequest, NextApiResponse } from "next";

// This endpoint has been intentionally removed. We keep a stub handler so builds don't fail
// and any stray requests receive a clear response.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
	res.status(410).json({ error: "Voice stream endpoint has been removed from this deployment." });
}

// Disable body parsing just in case clients still attempt to open long-lived connections.
export const config = {
	api: {
		bodyParser: false,
	},
};

