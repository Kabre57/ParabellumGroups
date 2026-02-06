import { Project, ProjectStatus } from '../shared/types';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedToId?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  projectId: string;
  taskId?: string;
  userId: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  date: string;
  hours: number;
  description?: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  billable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  project?: Project;
  taskId?: string;
  task?: Task;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location?: string;
  attendees?: string[];
  type: 'MEETING' | 'DEADLINE' | 'MILESTONE' | 'REMINDER' | 'OTHER';
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectData {
  name: string;
  description?: string;
  customerId: string;
  status?: ProjectStatus;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate: string;
  endDate?: string;
  budget?: number;
  currency?: string;
  managerId: string;
}

export interface TaskData {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedToId?: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
}
