/**
 * @typedef {Object} PublicUser
 * @property {number} id
 * @property {string} name
 * @property {string} lastname
 * @property {string} email
 * @property {string | null} phone
 * @property {string} role
 */

/**
 * @param {string} fullName
 * @returns {{ name: string, lastname: string }}
 */
export function splitFullName(fullName) {
  const clean = (fullName || "").trim();
  if (!clean) return { name: "", lastname: "" };
  const [first, ...rest] = clean.split(/\s+/);
  return { name: first, lastname: rest.join(" ") };
}

/**
 * @param {import("@prisma/client").User} user
 * @returns {PublicUser}
 */
export function toPublicUser(user) {
  const split = splitFullName(user.name);
  return {
    id: user.id,
    name: split.name,
    lastname: split.lastname,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}
