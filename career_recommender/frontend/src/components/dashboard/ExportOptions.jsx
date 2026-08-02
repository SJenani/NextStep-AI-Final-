import { FileText, Printer } from "lucide-react";

export default function ExportOptions({ model }) {
  const report = {
    readinessScore: model.readinessScore,
    atsScore: model.atsScore,
    resumeMatch: Math.round(model.resumeMatch),
    recommendedRole: model.recommendedRole,
    strongestSkills: model.matchedSkills.slice(0, 8),
    missingSkills: model.missingSkills.slice(0, 8),
    quickWins: model.quickWins,
    exportedAt: new Date().toISOString(),
  };

  const downloadReport = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "skill-report.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-export-actions print-hide">
      <button type="button" onClick={downloadReport}><FileText size={16} /> Export Skill Report</button>
      <button type="button" onClick={() => window.print()}><Printer size={16} /> Print Report</button>
    </div>
  );
}
