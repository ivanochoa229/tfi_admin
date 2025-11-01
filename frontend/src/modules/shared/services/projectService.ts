import { Project } from '../types/project';

const projectService = {
  async getProjects(): Promise<Project[]> {
    return Promise.resolve([]);
  },
  async getProjectById(_projectId: string): Promise<Project | undefined> {
    return Promise.resolve(undefined);
  }
};

export default projectService;