const { z } = require('zod');

const base = {
  fullName: z.string().min(2).max(120),
  email: z.string().email().optional(),         // optional if you allow teacher without system login for now
  phone: z.string().min(5).max(20).optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dob: z.coerce.date().optional(),
  address: z.string().max(300).optional(),
  qualifications: z.array(z.string()).optional(),
  experience: z.number().int().min(0).optional(),
  subjects: z.array(z.string()).optional(),
  classes: z.array(z.string()).optional(),
  photo: z.string().url().optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
  dateJoined: z.coerce.date().optional(),
};

exports.createTeacherSchema = z.object({
  body: z.object({
    ...base,
    fullName: base.fullName, // required
  }),
});

exports.updateTeacherSchema = z.object({
  body: z.object(base).partial(),
});
