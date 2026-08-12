type AccessUser = {
  role?: string | null;
  status?: string | null;
};

export function isStaff(user: AccessUser): boolean {
  return user.role === 'coach' || user.role === 'admin';
}

export function canAccessMemberFeatures(user: AccessUser): boolean {
  return isStaff(user) || user.status === 'approved';
}
