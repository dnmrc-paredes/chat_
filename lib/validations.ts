import z from "zod"

export const SignUpSchema = z
  .object({
    name: z.string().trim().min(1, "Invalid name"),
    email: z.email("Invalid email address").trim(),
    password: z.string().min(8, "Password must have atleast 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const SignInSchema = z.object({
  email: z.email("Invalid email address").trim(),
  password: z.string().min(1, "Invalid password"),
})

export const ProfileSettingsSchema = z.object({
  name: z.string().trim().min(1, "Invalid name"),
  username: z.string().trim().max(30, "Username must be 30 characters or less"),
  password: z.string().min(1, "Password is required to confirm changes"),
})
