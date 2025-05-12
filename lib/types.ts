export interface User {
  _id?: string
  id?: string
  name: string
  email: string
  password?: string
  role: "read" | "write" | "superadmin" | "owner"
  organizationId: string
  createdAt: Date
  updatedAt?: Date
}

export interface Organization {
  _id?: string
  id: string
  name: string
  uuid: string
  ownerId: string
  createdAt: Date
  updatedAt?: Date
}
