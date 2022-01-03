import { NextApiRequest, NextApiResponse } from "next";
import MyMongo from "../../../lib/mongodb";
import nextConnect from "next-connect";
import validateUser, {
	CREDENTIAL,
} from "../../../middleware/check_auth_perms";

const apiRoute = nextConnect({
	onError(error, req: NextApiRequest, res: NextApiResponse) {
		res.status(501).json({ error: `${error.message}` });
	},
	onNoMatch(req, res: NextApiResponse) {
		res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
	},
});
apiRoute.use((req, res, next) =>
	validateUser(req, res, CREDENTIAL.ADMIN, next)
);

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const updateResult = await MyMongo.collection("missions").updateMany(
		{
			votes: { $exists: true, $type: "array", $ne: [] },
		},
		{
			$set: {
				votes: [],
			},
		}
	);

	return res.status(200).json({ ok: true });
});

export default apiRoute;
