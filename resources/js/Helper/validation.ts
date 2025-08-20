import { z } from "zod";

export const passwordSchema = z
	.string()
	.min(1, "Password is required.")
	.min(8, "Password must be at least 8 characters long.")
	.regex(/[a-z]/, "Password must contain at least one lowercase letter.")
	.regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
	.regex(/[0-9]/, "Password must contain at least one number.")
	.regex(
		/[!@#$%^&*(),.?":{}|<>]/,
		"Password must contain at least one special character."
	);

export const emailSchema = z
	.string()
	.min(1, "Email is required.")
	.email("Please enter a valid email address.");

export const nameSchema = z
	.string()
	.min(1, "Name is required.")
	.min(2, "Name must be at least 2 characters long.")
	.max(255, "Name must not exceed 255 characters.");

export const passwordUpdateSchema = z
	.object({
		current_password: z.string().min(1, "Current password is required."),
		password: passwordSchema,
		password_confirmation: z
			.string()
			.min(1, "Password confirmation is required."),
	})
	.refine((data) => data.password === data.password_confirmation, {
		message: "Password confirmation does not match.",
		path: ["password_confirmation"],
	});

export const userSchema = z
	.object({
		name: nameSchema,
		email: emailSchema,
		password: passwordSchema.optional(),
		password_confirmation: z.string().optional(),
	})
	.refine(
		(data) => {
			if (data.password && !data.password_confirmation) {
				return false;
			}
			if (data.password && data.password !== data.password_confirmation) {
				return false;
			}
			return true;
		},
		{
			message: "Password confirmation does not match.",
			path: ["password_confirmation"],
		}
	);

export const hubSchema = z.object({
	name: nameSchema,
	slug: z
		.string()
		.min(1, "Slug is required.")
		.regex(
			/^[a-z0-9-]+$/,
			"Slug must contain only lowercase letters, numbers, and hyphens."
		),
	description: z.string().optional(),
	url: z.string().url("Please enter a valid URL.").optional(),
});

export const avatarUpdateSchema = z.object({
	avatar: z.any().optional(),
});

export const profileUpdateSchema = z.object({
	name: nameSchema,
	email: emailSchema,
});

export const validateAvatar = (
	avatar: any
): { isValid: boolean; error?: string } => {
	if (!avatar || avatar === null) {
		return { isValid: true };
	}

	if (avatar instanceof File) {
		// Check file type
		const validTypes = [
			"image/jpeg",
			"image/jpg",
			"image/png",
			"image/gif",
			"image/webp",
		];
		if (!validTypes.includes(avatar.type)) {
			return {
				isValid: false,
				error: "Please select a valid image file (JPEG, PNG, GIF, WebP).",
			};
		}

		const maxSize = 5 * 1024 * 1024; // 5MB
		if (avatar.size > maxSize) {
			return {
				isValid: false,
				error: "File size must be under 5MB.",
			};
		}
	}

	return { isValid: true };
};

export const validateWithZod = <T>(
	schema: z.ZodSchema<T>,
	data: any
):
	| { success: true; data: T }
	| { success: false; errors: { [key: string]: string } } => {
	const result = schema.safeParse(data);

	if (result.success) {
		return { success: true, data: result.data };
	}

	const errors: { [key: string]: string } = {};
	result.error.issues.forEach((issue) => {
		const field = issue.path[0] as string;
		errors[field] = issue.message;
	});

	return { success: false, errors };
};

export type PasswordUpdateData = z.infer<typeof passwordUpdateSchema>;
export type UserData = z.infer<typeof userSchema>;
export type HubData = z.infer<typeof hubSchema>;
export type AvatarUpdateData = z.infer<typeof avatarUpdateSchema>;
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
