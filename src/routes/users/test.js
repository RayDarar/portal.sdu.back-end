import { Router } from "express";
import UsersService from "@/services/users";
import middleware from "@/middleware";

const router = Router();

router.post("/create", middleware.publicApi(), async (req, res) => {
  const result = await UsersService.create(req.body);

  return res.status(result.status ? 200 : 406).send(result);
});

export default router;
