# 🧪 Complete Testing Guide

## Prerequisites
- ✅ Backend running: `npm run dev` (in server folder)
- ✅ Frontend running: `npm run dev` (in client folder)
- ✅ MongoDB running

---

## 🗑️ STEP 1: Clear Old Data

cd server
node scripts/clear-database.js

Type: DELETE ALL DATA
text

**Expected:** All old data deleted, clean database.

---

## 🏫 STEP 2: Register First School

### Method A: Via Frontend (Recommended)

1. **Go to:** `http://localhost:5173/register-school`

2. **Fill School Info:**
   - School Name: `ABC Academy`
   - School Email: `contact@abcacademy.com`
   - Phone: `+92 300 1234567`
   - Subdomain: `abc-academy`
   - Click **Continue**

3. **Fill Admin Info:**
   - Admin Name: `Admin User`
   - Admin Email: `admin@abcacademy.com`
   - Password: `Admin@123`
   - Confirm Password: `Admin@123`
   - ✅ Accept Terms
   - Click **Complete Registration**

4. **Expected Result:**
   - ✅ Success message
   - ✅ Redirected to verify email page
   - ✅ Check terminal for email (dev mode logs it)

### Method B: Use Test Data Script

cd server
node scripts/create-test-data.js

text

**Creates:**
- ABC Academy (admin@abcacademy.com / Admin@123)
- XYZ School (admin@xyzschool.com / Admin@123)
- 1 Teacher, 1 Student

---

## 🔐 STEP 3: Verify Email (Dev Mode)

**In Development:**
- Check server terminal for verification link
- Copy the token from the URL
- Or skip by manually setting `isVerified: true` in database

**In Production:**
- Email will be sent automatically
- Click link in email

---

## 🚪 STEP 4: Login as Admin

1. **Go to:** `http://localhost:5173/login`
2. **Enter:**
   - Email: `admin@abcacademy.com`
   - Password: `Admin@123`
3. **Click:** Sign in

**Expected:**
- ✅ Success toast
- ✅ Redirected to `/admin/dashboard`
- ✅ See admin dashboard

---

## 👥 STEP 5: Invite Users (Teacher/Student)

1. **In Admin Dashboard:**
   - Go to **Settings** or **Users** section
   - Click **Invite User**

2. **Fill Form:**
   - Email: `teacher@abcacademy.com`
   - Role: Teacher
   - Click **Send Invitation**

3. **Expected:**
   - ✅ Invitation sent
   - ✅ Check server logs for invitation link

4. **Teacher Registration:**
   - Go to invitation link
   - Complete registration
   - Verify email
   - Login as teacher

---

## 🧪 STEP 6: Test Multi-Tenant Isolation

### Test 1: Register Second School

1. Logout from ABC Academy
2. Go to `/register-school`
3. Register: XYZ School
4. Admin: `admin@xyzschool.com`
5. Password: `Admin@123`

### Test 2: Verify Data Isolation

**Login as ABC Admin:**
- Create student: `alice@abcacademy.com`
- Check student list → Should see only ABC students

**Login as XYZ Admin:**
- Create student: `bob@xyzschool.com`
- Check student list → Should see only XYZ students

✅ **Perfect Isolation!** Each school sees only their data.

---

## 🔄 STEP 7: Test Token Refresh

1. Login as admin
2. Wait 16 minutes (access token expires in 15 min)
3. Make any API call
4. **Expected:**
   - ✅ Token auto-refreshed
   - ✅ Request succeeds
   - ✅ No re-login required

---

## 🔒 STEP 8: Test Password Reset

1. Go to `/login`
2. Click **Forgot password?**
3. Enter: `admin@abcacademy.com`
4. **Expected:**
   - ✅ Reset email sent (check terminal)
   - ✅ Copy reset link
5. Go to reset link
6. Enter new password
7. **Expected:**
   - ✅ Password changed
   - ✅ Can login with new password

---

## 📧 STEP 9: Test Email Verification

1. Register new user
2. Don't verify email
3. Try to login
4. **Expected:**
   - ✅ Login succeeds (if REQUIRE_EMAIL_VERIFICATION=false)
   - ❌ Login fails (if REQUIRE_EMAIL_VERIFICATION=true)

---

## 🛡️ STEP 10: Test Security Features

### Test Rate Limiting

1. Go to `/login`
2. Try wrong password 6 times
3. **Expected:**
   - ✅ 5th attempt: Account locked message
   - ✅ 6th attempt: Rate limit error

### Test RBAC

1. Login as student
2. Try to access `/admin`
3. **Expected:**
   - ✅ Redirected or 403 error

---

## ✅ Success Checklist

- [ ] Database cleared successfully
- [ ] School registered via frontend
- [ ] Admin can login
- [ ] Email verification works
- [ ] Password reset works
- [ ] Token refresh works automatically
- [ ] Multi-tenant isolation verified
- [ ] Teacher invitation works
- [ ] Student can be added
- [ ] Rate limiting works
- [ ] RBAC permissions work
- [ ] Old features (students, classes) still work

---

## 🐛 Troubleshooting

### Login fails with "Invalid credentials"
- Check if email is verified
- Check if password is correct (case-sensitive)
- Check server logs for detailed error

### CORS error
- Verify `.env` has `CORS_ORIGIN=http://localhost:5173`
- Restart server after env changes

### Token not refreshing
- Check browser cookies (should have refreshToken)
- Check if httpOnly cookies are enabled

### Multi-tenant not working
- Check if tenantId is set in JWT payload
- Check if middleware is applied to routes

---

## 🎉 If All Tests Pass

**CONGRATULATIONS!** 🎊

You have a **production-ready, multi-tenant SaaS school management system** with:

✅ Complete authentication system
✅ Multi-tenant data isolation
✅ Email verification
✅ Password reset
✅ Token refresh
✅ RBAC permissions
✅ Rate limiting
✅ Audit logging
✅ Security best practices

**Ready for production deployment!** 🚀