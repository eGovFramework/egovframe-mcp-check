/**
 * Tool for checking eGovFrame architecture compliance
 */

import { checkEgovArchitecture, exportArchResults } from "../utils/archChecker.js";

export interface CheckArchitectureOptions {
  projectPath: string;
  exportResults?: boolean;
}

/**
 * Check eGovFrame project architecture compliance
 */
export async function checkArchitecture(options: CheckArchitectureOptions): Promise<string> {
  const { projectPath, exportResults = false } = options;

  if (!projectPath || !projectPath.trim()) {
    throw new Error("projectPath is required");
  }

  // Progress messages
  const progressMessages: string[] = [];
  const progressCallback = (message: string) => {
    progressMessages.push(message);
  };

  // Perform architecture check
  const results = await checkEgovArchitecture(projectPath, progressCallback);

  // Calculate total statistics
  const totalFiles = Object.values(results).reduce((sum, summary) => sum + (summary?.totalFiles || 0), 0);
  const passedFiles = Object.values(results).reduce((sum, summary) => sum + (summary?.passedFiles || 0), 0);
  const failedFiles = Object.values(results).reduce((sum, summary) => sum + (summary?.failedFiles || 0), 0);
  const complianceRate = totalFiles > 0 ? Math.round((passedFiles / totalFiles) * 100) : 0;

  // Export to CSV if requested
  if (exportResults && totalFiles > 0) {
    await exportArchResults(results, projectPath);
    progressMessages.push(`📄 Results exported to CSV files in: ${projectPath}`);
  }

  // Format output
  const output = [
    `✅ eGovFrame Architecture Check Completed`,
    ``,
    `📊 Overall Statistics:`,
    `  • Total Files: ${totalFiles}`,
    `  • Passed: ${passedFiles} ✓`,
    `  • Failed: ${failedFiles} ✗`,
    `  • Compliance Rate: ${complianceRate}%`,
    ``,
    `📋 Layer Details:`,
  ];

  // Controller results
  if (results.Controller) {
    const c = results.Controller;
    output.push(
      ``,
      `  🎯 Controller Layer:`,
      `     Total: ${c.totalFiles} | Passed: ${c.passedFiles} ✓ | Failed: ${c.failedFiles} ✗`,
      `     Check: @Controller + Mapping Annotations`
    );
    
    if (c.failedFiles > 0) {
      output.push(`     Failed files:`);
      c.results
        .filter(r => r.result !== "OK")
        .slice(0, 5) // Show first 5 failed files
        .forEach(r => {
          const checks = [];
          if (!r.check1) checks.push("missing @Controller");
          if (!r.check2) checks.push("missing Mapping");
          output.push(`       ✗ ${r.fileName}: ${checks.join(", ")}`);
        });
      if (c.failedFiles > 5) {
        output.push(`       ... and ${c.failedFiles - 5} more`);
      }
    }
  }

  // Service results
  if (results.Service) {
    const s = results.Service;
    output.push(
      ``,
      `  ⚙️  Service Layer:`,
      `     Total: ${s.totalFiles} | Passed: ${s.passedFiles} ✓ | Failed: ${s.failedFiles} ✗`,
      `     Check: extends EgovAbstractServiceImpl + @Service + implements Service`
    );
    
    if (s.failedFiles > 0) {
      output.push(`     Failed files:`);
      s.results
        .filter(r => r.result !== "OK")
        .slice(0, 5)
        .forEach(r => {
          const checks = [];
          if (!r.check1) checks.push("missing extends");
          if (!r.check2) checks.push("missing @Service");
          if (!r.check3) checks.push("missing implements");
          output.push(`       ✗ ${r.fileName}: ${checks.join(", ")}`);
        });
      if (s.failedFiles > 5) {
        output.push(`       ... and ${s.failedFiles - 5} more`);
      }
    }
  }

  // DAO results
  if (results.DAO) {
    const d = results.DAO;
    output.push(
      ``,
      `  🗄️  DAO Layer:`,
      `     Total: ${d.totalFiles} | Passed: ${d.passedFiles} ✓ | Failed: ${d.failedFiles} ✗`,
      `     Check: @Repository + (EgovAbstractDAO or EgovAbstractMapper)`
    );
    
    if (d.failedFiles > 0) {
      output.push(`     Failed files:`);
      d.results
        .filter(r => r.result !== "OK")
        .slice(0, 5)
        .forEach(r => {
          const checks = [];
          if (!r.check1 && !r.check2) checks.push("missing @Repository + extends");
          output.push(`       ✗ ${r.fileName}: ${checks.join(", ")}`);
        });
      if (d.failedFiles > 5) {
        output.push(`       ... and ${d.failedFiles - 5} more`);
      }
    }
  }

  // Mapper results
  if (results.Mapper) {
    const m = results.Mapper;
    output.push(
      ``,
      `  🗺️  Mapper Layer:`,
      `     Total: ${m.totalFiles} | Passed: ${m.passedFiles} ✓ | Failed: ${m.failedFiles} ✗`,
      `     Check: @Mapper annotation`
    );
    
    if (m.failedFiles > 0) {
      output.push(`     Failed files:`);
      m.results
        .filter(r => r.result !== "OK")
        .slice(0, 5)
        .forEach(r => {
          output.push(`       ✗ ${r.fileName}: missing @Mapper`);
        });
      if (m.failedFiles > 5) {
        output.push(`       ... and ${m.failedFiles - 5} more`);
      }
    }
  }

  output.push(
    ``,
    `Progress:`,
    ...progressMessages.map(msg => `  ${msg}`)
  );

  if (exportResults) {
    output.push(
      ``,
      `📁 Exported Files:`,
      `  • Result_Controller_*.csv`,
      `  • Result_Service_*.csv`,
      `  • Result_DAO_*.csv`,
      `  • Result_Mapper_*.csv`
    );
  }

  output.push(
    ``,
    `💡 Tips:`,
    `  • Use exportResults: true to save detailed results to CSV files`,
    `  • CSV files will be saved in the project directory`,
    `  • Review failed files to ensure eGovFrame standards compliance`
  );

  return output.join("\n");
}

