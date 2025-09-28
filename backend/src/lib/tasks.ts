import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { Task } from '../types.js';
import { OAuthService } from './oauth.js';

export interface TasksConfig {
  timezone: string;
}

export class TasksService {
  private oauthService: OAuthService;
  private config: TasksConfig;

  constructor(oauthService: OAuthService, config: TasksConfig) {
    this.oauthService = oauthService;
    this.config = config;
  }

  async fetchTasks(): Promise<Task[]> {
    try {
      const auth = await this.oauthService.getAuthenticatedClient();
      const tasks = google.tasks({ version: 'v1', auth });

      // Get task lists
      const listsResponse = await tasks.tasklists.list();
      const taskLists = listsResponse.data.items || [];

      if (taskLists.length === 0) {
        console.log('No task lists found');
        return [];
      }

      // Use the first task list (typically the default one)
      const defaultList = taskLists[0];
      console.log(`Using task list: ${defaultList.title} (${defaultList.id})`);

      // Fetch tasks from the default list
      const tasksResponse = await tasks.tasks.list({
        tasklist: defaultList.id!,
        showCompleted: true,
        showHidden: true,
        maxResults: 100
      });

      const googleTasks = tasksResponse.data?.items || [];
      
      return googleTasks
        .filter((task: any) => task.title) // Filter out tasks without titles
        .map((task: any) => this.mapGoogleTaskToTask(task, defaultList.id!))
        .sort((a: Task, b: Task) => {
          // Sort by due date (tasks without due dates go to end)
          if (!a.due && !b.due) return 0;
          if (!a.due) return 1;
          if (!b.due) return -1;
          return a.due.localeCompare(b.due);
        });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  private mapGoogleTaskToTask(googleTask: any, listId: string): Task {
    const task: Task = {
      id: googleTask.id!,
      listId: listId,
      title: googleTask.title!,
      notes: googleTask.notes,
      status: googleTask.status === 'completed' ? 'completed' : 'needsAction',
      updated: googleTask.updated!
    };

    if (googleTask.due) {
      // Google Tasks API returns due date in RFC3339 format
      const dueDate = DateTime.fromISO(googleTask.due, { zone: this.config.timezone });
      task.due = dueDate.toISO() || undefined;
    }

    if (googleTask.completed) {
      const completedDate = DateTime.fromISO(googleTask.completed, { zone: this.config.timezone });
      task.completedAt = completedDate.toISO() || undefined;
    }

    return task;
  }
}
