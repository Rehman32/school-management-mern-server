const ROLES = {
    ADMIN: 'admin',
    TEACHER: 'teacher',
    STUDENT: 'student',
    PARENT: 'parent'
};

const PERMISSIONS = {
    admin: ['*'],
    teacher: [
        'attendance.take',
        'attendance.view',
        'exam.create',
        'exam.view',
        'student.view'
    ],
    parent: [
        'student.view',
        'attendance.view',
        'fees.view'
    ]
};

function roleHasPermission(role, permission) {
    const perms = PERMISSIONS[role];
    if (!perms) return false;
    if (perms.includes('*')) return true;
    return perms.includes(permission);
}

module.exports = {
    ROLES,
    PERMISSIONS,
    roleHasPermission
};