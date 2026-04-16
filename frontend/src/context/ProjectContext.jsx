import { createContext, useState } from 'react';

export const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [currentProjectId, setCurrentProjectId] = useState(null);

  return (
    <ProjectContext.Provider value={{ currentProjectId, setCurrentProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}