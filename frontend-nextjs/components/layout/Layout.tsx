// LAYOUT COMPONENT
import React from 'react';
import Sidebar from './Sidebar';
import { cn } from '../../lib/utils';

export interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, className = '' }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-[#070b12] text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className={cn("flex-1 overflow-y-auto bg-[#070b12] p-6", className)}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
export { Layout };
// END LAYOUT COMPONENT
