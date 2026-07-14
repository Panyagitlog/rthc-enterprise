import bcrypt from "bcrypt";
import { findUserByEmail } from "../repositories/auth.repository";
import { generateToken } from "../utils/jwt";

export async function login(email: string, password: string) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    throw new Error("Invalid email or password");
  }

  const token = generateToken({
    id: user.id,
    role: user.role,
    email: user.email,
  });

  const { password: _, ...safeUser } = user;

  return {
    token,
    user: safeUser,
  };
}
