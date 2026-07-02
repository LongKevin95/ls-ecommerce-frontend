import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Invalid email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  phone: z.string().trim().optional(),
  avatarUrl: z.string().trim().optional(),
  address: z.string().trim().optional(),
  bio: z.string().trim().optional(),
});

export const checkoutSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  address: z.string().trim().min(1, "Address is required."),
  city: z.string().trim().min(1, "City is required."),
  state: z.string().trim().min(1, "State is required."),
  zipCode: z.string().trim().min(1, "ZIP code is required."),
  country: z.string().trim().min(1, "Country is required."),
  phone: z.string().trim().min(1, "Phone number is required."),
  email: z.email("Contact email is invalid."),
  paymentMethod: z.enum(["cod", "sepay"]),
});
