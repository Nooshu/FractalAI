/**
 * Diff Analyzer for Visual Regression Tests
 * 
 * This utility analyzes differences between baseline and actual screenshots
 * to provide insights into what changed and why.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Analyze differences in visual regression test results
 * 
 * @param {string} testResultsPath - Path to Playwright test results JSON
 * @returns {Object} Analysis report
 */
export function analyzeDiffs(testResultsPath = 'test-results/results.json') {
  if (!existsSync(testResultsPath)) {
    throw new Error(`Test results file not found: ${testResultsPath}`);
  }

  const results = JSON.parse(readFileSync(testResultsPath, 'utf-8'));
  const analysis = {
    total: 0,
    passed: 0,
    failed: 0,
    failures: [],
    byFractal: {},
    summary: {
      totalPixels: 0,
      totalDiffs: 0,
      avgDiffPercent: 0,
    },
  };

  // Process each test result
  for (const suite of results.suites || []) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        analysis.total++;
        
        if (test.status === 'passed') {
          analysis.passed++;
        } else if (test.status === 'failed') {
          analysis.failed++;
          
          // Extract fractal name from test title
          const fractalMatch = test.title.match(/Fractal: (.+)/);
          const fractalName = fractalMatch ? fractalMatch[1] : 'unknown';
          
          // Analyze failure
          const failure = {
            fractal: fractalName,
            title: test.title,
            error: test.results[0]?.error?.message || 'Unknown error',
            screenshots: [],
            diffs: [],
          };
          
          // Find screenshot attachments
          for (const result of test.results || []) {
            for (const attachment of result.attachments || []) {
              if (attachment.type === 'screenshot') {
                failure.screenshots.push({
                  name: attachment.name,
                  path: attachment.path,
                  contentType: attachment.contentType,
                });
              }
            }
          }
          
          analysis.failures.push(failure);
          
          // Group by fractal
          if (!analysis.byFractal[fractalName]) {
            analysis.byFractal[fractalName] = {
              total: 0,
              failed: 0,
              failures: [],
            };
          }
          analysis.byFractal[fractalName].total++;
          analysis.byFractal[fractalName].failed++;
          analysis.byFractal[fractalName].failures.push(failure);
        }
      }
    }
  }

  // Calculate summary statistics
  if (analysis.failed > 0) {
    // This would require parsing actual diff images
    // For now, we provide a structure for future enhancement
    analysis.summary.totalFailures = analysis.failed;
    analysis.summary.failureRate = (analysis.failed / analysis.total) * 100;
  }

  return analysis;
}

/**
 * Generate a human-readable report from analysis
 */
export function generateReport(analysis) {
  const lines = [];
  
  lines.push('='.repeat(80));
  lines.push('Visual Regression Test Analysis');
  lines.push('='.repeat(80));
  lines.push('');
  lines.push(`Total Tests: ${analysis.total}`);
  lines.push(`Passed: ${analysis.passed} (${((analysis.passed / analysis.total) * 100).toFixed(1)}%)`);
  lines.push(`Failed: ${analysis.failed} (${((analysis.failed / analysis.total) * 100).toFixed(1)}%)`);
  lines.push('');
  
  if (analysis.failed > 0) {
    lines.push('Failed Tests by Fractal:');
    lines.push('-'.repeat(80));
    
    const sortedFractals = Object.entries(analysis.byFractal)
      .sort((a, b) => b[1].failed - a[1].failed);
    
    for (const [fractal, stats] of sortedFractals) {
      lines.push(`  ${fractal}: ${stats.failed}/${stats.total} failed`);
    }
    
    lines.push('');
    lines.push('Detailed Failures:');
    lines.push('-'.repeat(80));
    
    for (const failure of analysis.failures.slice(0, 10)) {
      lines.push(`  ${failure.fractal}:`);
      lines.push(`    Error: ${failure.error}`);
      if (failure.screenshots.length > 0) {
        lines.push(`    Screenshots: ${failure.screenshots.length} found`);
      }
    }
    
    if (analysis.failures.length > 10) {
      lines.push(`  ... and ${analysis.failures.length - 10} more failures`);
    }
  } else {
    lines.push('✓ All tests passed!');
  }
  
  lines.push('');
  lines.push('='.repeat(80));
  
  return lines.join('\n');
}

/**
 * CLI entry point
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const resultsPath = process.argv[2] || 'test-results/results.json';
  
  try {
    const analysis = analyzeDiffs(resultsPath);
    const report = generateReport(analysis);
    console.log(report);
    
    // Exit with error code if there are failures
    process.exit(analysis.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Error analyzing test results:', error.message);
    process.exit(1);
  }
}

