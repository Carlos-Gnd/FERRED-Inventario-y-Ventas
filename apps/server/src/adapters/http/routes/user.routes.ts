import { Router } from "express";
import * as userController from "../controllers/user.controller";

export const userRouter = Router();

// CRUD Usuarios
userRouter.get("/", userController.list);
userRouter.get("/:id", userController.getById);
userRouter.post("/", userController.create);
userRouter.put("/:id", userController.update);
userRouter.delete("/:id", userController.remove);
