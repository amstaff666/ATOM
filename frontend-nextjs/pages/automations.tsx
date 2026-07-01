import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Play, LayoutTemplate, Database, History, Plus, Zap, Bot
} from 'lucide-react';
import WorkflowAutomation from '../components/WorkflowAutomation';
import TemplateGallery from '@/components/Automations/TemplateGallery';
import WorkflowTables from '@/components/Automations/WorkflowTables';
import FlowVersioning from '@/components/Automations/FlowVersioning';
import AgentWorkflowGenerator from '@/components/Automations/AgentWorkflowGenerator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TabType = 'flows' | 'agents' | 'templates' | 'tables' | 'versions';

const TABS = [
  { id: 'flows' as TabType, label: 'Töövood', icon: Play, description: 'Ehita ja halda automatsioone' },
  { id: 'agents' as TabType, label: 'AI agendid', icon: Bot, description: 'Spetsialist-agendid loovad töövooge' },
  { id: 'templates' as TabType, label: 'Mallid', icon: LayoutTemplate, description: 'Valmis töövoomallid' },
  { id: 'tables' as TabType, label: 'Tabelid', icon: Database, description: 'Töövoogude andmesalvestus' },
  { id: 'versions' as TabType, label: 'Versioonid', icon: History, description: 'Versioonide ajalugu' },
];

const AutomationsPage: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('flows');

  const [triggerNew, setTriggerNew] = useState(0);

  const handleUseTemplate = (template: any) => {
    // Store template and switch to flows tab
    sessionStorage.setItem('selectedTemplate', JSON.stringify(template));
    setActiveTab('flows');
  };

  return (
    <>
      <Head>
        <title>Automatsioonid | Annaator</title>
        <meta name="description" content="Ehita AI abil töövoogude automatsioone ja ühenda teenuseid." />
      </Head>
      <div className="min-h-screen bg-[#070b12] flex flex-col text-slate-100">
        {/* Header with Tabs */}
        <div className="border-b border-slate-800/80 bg-[#0a0f1a]/90">
          <div className="max-w-screen-2xl mx-auto px-4">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="bg-violet-600 p-2 rounded-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Automatsioonid</h1>
                  <p className="text-sm text-slate-400">Ehita AI töövooge • 30+ integratsiooni</p>
                </div>
              </div>
              <Button onClick={() => { setActiveTab('flows'); setTriggerNew(function(n) { return n + 1; }); }}>
                <Plus className="w-4 h-4 mr-2" />
                Uus automatsioon
              </Button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors font-medium text-sm",
                      activeTab === tab.id
                        ? "border-violet-600 text-violet-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:border-gray-600"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {activeTab === 'flows' && (
            <WorkflowAutomation triggerNew={triggerNew} />
          )}

          {activeTab === 'agents' && (
            <AgentWorkflowGenerator
              onWorkflowGenerated={(wf) => console.log('Generated:', wf)}
              onDeployWorkflow={(wf) => {
                console.log('Deploying:', wf);
                setActiveTab('flows');
              }}
              className="h-[calc(100vh-120px)]"
            />
          )}

          {activeTab === 'templates' && (
            <TemplateGallery onUseTemplate={handleUseTemplate} />
          )}

          {activeTab === 'tables' && (
            <WorkflowTables className="h-[calc(100vh-120px)]" />
          )}

          {activeTab === 'versions' && (
            <FlowVersioning className="h-[calc(100vh-120px)]" />
          )}
        </div>
      </div>
    </>
  );
};

export default AutomationsPage;
