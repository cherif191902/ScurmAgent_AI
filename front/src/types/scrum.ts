export interface TeamMember {
  id: string;
  name: string;
  skills: string[];
}

export interface UserStory {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  storyPoints: number;
  acceptanceCriteria: string[];
}

export interface Task {
  id: string;
  userStoryId: string;
  title: string;
  description: string;
  assignedTo: string;
  estimatedHours: number;
  requiredSkills: string[];
}

export interface Sprint {
  sprintNumber: number;
  goal: string;
  duration: string;
  userStories: string[];
  tasks: Task[];
}

export interface ScrumResult {
  productBacklog: UserStory[];
  sprints: Sprint[];
  summary: {
    totalUserStories: number;
    totalSprints: number;
    totalTasks: number;
    sprintDuration: string;
  };
}
