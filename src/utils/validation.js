import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Email không hợp lệ."),
  password: z.string().min(6, "Mật khẩu cần ít nhất 6 ký tự."),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Tên cần ít nhất 2 ký tự."),
  phone: z.string().trim().optional(),
  avatarUrl: z.string().trim().optional(),
  address: z.string().trim().optional(),
  bio: z.string().trim().optional(),
});

export const checkoutSchema = z.object({
  firstName: z.string().trim().min(1, "Thiếu first name."),
  lastName: z.string().trim().min(1, "Thiếu last name."),
  address: z.string().trim().min(1, "Thiếu địa chỉ."),
  city: z.string().trim().min(1, "Thiếu city."),
  state: z.string().trim().min(1, "Thiếu state."),
  zipCode: z.string().trim().min(1, "Thiếu zip code."),
  country: z.string().trim().min(1, "Thiếu country."),
  phone: z.string().trim().min(1, "Thiếu phone."),
  email: z.email("Email liên hệ không hợp lệ."),
  paymentMethod: z.enum(["cod", "card"]),
});
