import React, { useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Handle, 
  Position,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { User, Briefcase, CheckCircle2, AlertCircle } from 'lucide-react';

const UserNode = ({ data }) => (
  <div className="bg-white border-2 border-indigo-500 rounded-xl p-3 shadow-lg flex items-center gap-3 w-48">
    <div className="bg-indigo-100 p-2 rounded-lg">
      <User className="text-indigo-600 h-5 w-5" />
    </div>
    <div>
      <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Candidate</p>
      <p className="text-[10px] text-slate-500 font-medium truncate">{data.name || "You"}</p>
    </div>
    <Handle type="source" position={Position.Right} className="w-2 h-2 bg-indigo-500" />
  </div>
);

const TargetNode = ({ data }) => (
  <div className="bg-white border-2 border-emerald-500 rounded-xl p-3 shadow-lg flex items-center gap-3 w-48">
    <Handle type="target" position={Position.Left} className="w-2 h-2 bg-emerald-500" />
    <div className="bg-emerald-100 p-2 rounded-lg">
      <Briefcase className="text-emerald-600 h-5 w-5" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-slate-800 uppercase tracking-wide truncate">Target Role</p>
      <p className="text-[10px] text-slate-500 font-medium truncate">{data.role || "Dream Job"}</p>
    </div>
  </div>
);

const SkillNode = ({ data }) => {
  const isMatch = data.isMatch;
  return (
    <div className={`bg-white border-2 rounded-full px-4 py-1.5 shadow-sm flex items-center gap-2 ${isMatch ? 'border-emerald-400' : 'border-rose-400'}`}>
      <Handle type="target" position={Position.Left} className={`w-1.5 h-1.5 ${isMatch ? 'bg-emerald-400' : 'bg-rose-400'}`} />
      {isMatch ? (
        <CheckCircle2 className="text-emerald-500 h-3 w-3" />
      ) : (
        <AlertCircle className="text-rose-500 h-3 w-3" />
      )}
      <span className="text-xs font-bold text-slate-700">{data.label}</span>
      <Handle type="source" position={Position.Right} className={`w-1.5 h-1.5 ${isMatch ? 'bg-emerald-400' : 'bg-rose-400'}`} />
    </div>
  );
};

const nodeTypes = {
  userNode: UserNode,
  targetNode: TargetNode,
  skillNode: SkillNode,
};

export default function CareerRoadmap({ originalSkills = [], missingSkills = [], targetRole = "Target Role" }) {
  const nodes = useMemo(() => {
    const totalSkills = originalSkills.length + missingSkills.length;
    const verticalSpacing = 45;
    const startY = -((totalSkills - 1) * verticalSpacing) / 2;

    const initialNodes = [
      {
        id: 'user',
        type: 'userNode',
        position: { x: 0, y: 0 },
        data: { name: 'Your Profile' },
      },
      {
        id: 'target',
        type: 'targetNode',
        position: { x: 600, y: 0 },
        data: { role: targetRole },
      }
    ];

    let currentY = startY;

    // Add matched skills
    originalSkills.forEach((skill, index) => {
      initialNodes.push({
        id: `match-${index}`,
        type: 'skillNode',
        position: { x: 300, y: currentY },
        data: { label: skill, isMatch: true },
      });
      currentY += verticalSpacing;
    });

    // Add missing skills
    missingSkills.forEach((skill, index) => {
      initialNodes.push({
        id: `miss-${index}`,
        type: 'skillNode',
        position: { x: 300, y: currentY },
        data: { label: skill, isMatch: false },
      });
      currentY += verticalSpacing;
    });

    return initialNodes;
  }, [originalSkills, missingSkills, targetRole]);

  const edges = useMemo(() => {
    const initialEdges = [];

    originalSkills.forEach((_, index) => {
      initialEdges.push({
        id: `e-user-match-${index}`,
        source: 'user',
        target: `match-${index}`,
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 2 }, // emerald
      });
      initialEdges.push({
        id: `e-match-target-${index}`,
        source: `match-${index}`,
        target: 'target',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
      });
    });

    missingSkills.forEach((_, index) => {
      initialEdges.push({
        id: `e-user-miss-${index}`,
        source: 'user',
        target: `miss-${index}`,
        animated: false,
        style: { stroke: '#f43f5e', strokeWidth: 2, strokeDasharray: '5, 5' }, // rose, dashed
      });
      initialEdges.push({
        id: `e-miss-target-${index}`,
        source: `miss-${index}`,
        target: 'target',
        animated: true,
        style: { stroke: '#f43f5e', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' },
      });
    });

    return initialEdges;
  }, [originalSkills, missingSkills]);

  return (
    <div className="w-full h-[500px] border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-inner">
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={2}
      >
        <Background color="#cbd5e1" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
