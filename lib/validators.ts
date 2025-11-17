import { z } from 'zod';

// Profile validation
export const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  bio: z.string().max(500, 'Bio too long').optional(),
  skills: z.array(z.string()).min(1, 'At least one skill required').max(20, 'Too many skills'),
  interests: z.array(z.string()).min(1, 'At least one interest required').max(20, 'Too many interests'),
  github_url: z.string().url('Invalid GitHub URL').or(z.literal('')).optional(),
  portfolio_url: z.string().url('Invalid portfolio URL').or(z.literal('')).optional(),
  photo_url: z.string().url('Invalid photo URL').or(z.literal('')).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

// Message validation
export const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(500, 'Message too long'),
  match_id: z.string().uuid('Invalid match ID'),
});

export type MessageInput = z.infer<typeof messageSchema>;

// Auth validation
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

// Swipe validation
export const swipeSchema = z.object({
  target_user_id: z.string().uuid('Invalid user ID'),
  is_like: z.boolean(),
});

export type SwipeInput = z.infer<typeof swipeSchema>;

// Helper function to validate and return errors
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}
