#!/usr/bin/env node
/**
 * Weekly Post Generator
 *
 * This script:
 * 1. Reads collected commits from commits_output.txt
 * 2. Parses the commit data and trailers
 * 3. Outputs a formatted prompt ready to paste into Claude/ChatGPT
 * 4. Optionally writes the generated post to src/content/blog/
 *
 * Usage:
 *   node generate_weekly_post.js [repo_path]
 *   node generate_weekly_post.js --write-draft  # Creates a draft file after you paste AI output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.join(__dirname, '../../src/content/blog');

// Parse command line args
const args = process.argv.slice(2);
const repoPath = args.find(a => !a.startsWith('--')) || '.';
const writeDraft = args.includes('--write-draft');

// Calculate date range
const today = new Date();
const weekAgo = new Date(today);
weekAgo.setDate(weekAgo.getDate() - 7);

const formatDate = (d) => d.toISOString().split('T')[0];
const startDate = formatDate(weekAgo);
const endDate = formatDate(today);

/**
 * Parse a single commit block into structured data
 */
function parseCommit(commitBlock) {
    const lines = commitBlock.trim().split('\n');
    if (lines.length < 2) return null;

    const hash = lines[0];
    const subject = lines[1];
    const bodyLines = lines.slice(2);

    // Separate body text from trailers
    const trailers = {};
    const bodyText = [];

    for (const line of bodyLines) {
        const trailerMatch = line.match(/^([A-Za-z-]+):\s*(.+)$/);
        if (trailerMatch) {
            trailers[trailerMatch[1]] = trailerMatch[2].trim();
        } else if (line.trim()) {
            bodyText.push(line);
        }
    }

    return {
        hash: hash.substring(0, 8),
        subject,
        body: bodyText.join('\n'),
        trailers
    };
}

/**
 * Read and parse commits from the output file
 */
function readCommits(repoPath) {
    const commitsFile = path.join(repoPath, 'commits_output.txt');

    if (!fs.existsSync(commitsFile)) {
        console.error(`Error: ${commitsFile} not found.`);
        console.error('Run collect_commits.sh first.');
        process.exit(1);
    }

    const content = fs.readFileSync(commitsFile, 'utf-8');
    const commitBlocks = content.split('=== COMMIT ===').filter(b => b.trim());

    return commitBlocks
        .map(block => block.replace('=== END ===', '').trim())
        .map(parseCommit)
        .filter(c => c !== null);
}

/**
 * Filter out commits marked for skipping
 */
function filterCommits(commits) {
    return commits.filter(c => {
        const intent = c.trailers['Blog-Intent'] || 'normal';
        const conf = c.trailers['Confidentiality'] || 'public';
        return intent !== 'skip' && conf !== 'skip';
    });
}

/**
 * Format commits for the AI prompt
 */
function formatCommitsForPrompt(commits) {
    return commits.map(c => {
        let output = `### Commit: ${c.hash}\n`;
        output += `**Subject:** ${c.subject}\n`;

        if (c.body) {
            output += `**Body:**\n${c.body}\n`;
        }

        if (Object.keys(c.trailers).length > 0) {
            output += `**Trailers:**\n`;
            for (const [key, value] of Object.entries(c.trailers)) {
                output += `- ${key}: ${value}\n`;
            }
        }

        return output;
    }).join('\n---\n\n');
}

/**
 * Load the weekly post prompt template
 */
function loadPromptTemplate() {
    const templatePath = path.join(__dirname, 'templates/weekly-post.prompt.txt');
    return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Generate the full prompt to send to AI
 */
function generateFullPrompt(commits, startDate, endDate) {
    const template = loadPromptTemplate();
    const formattedCommits = formatCommitsForPrompt(commits);

    return `${template}

---

## COMMIT DATA FOR THIS WEEK (${startDate} to ${endDate})

${formattedCommits}

---

Please generate the weekly blog post now, replacing {START_DATE} with "${startDate}" and {END_DATE} with "${endDate}".`;
}

/**
 * Create a draft post file
 */
function createDraftFile(startDate, endDate) {
    const filename = `${endDate}-weekly-progress.md`;
    const filepath = path.join(BLOG_DIR, filename);

    // Ensure blog directory exists
    if (!fs.existsSync(BLOG_DIR)) {
        fs.mkdirSync(BLOG_DIR, { recursive: true });
    }

    const draft = `---
title: "Weekly Progress — ${startDate} to ${endDate}"
date: ${endDate}
tags: [devlog, weekly]
languages: []
patterns: []
architectures: []
draft: true
---

<!-- PASTE AI-GENERATED CONTENT BELOW THIS LINE -->
<!-- Then remove draft: true from frontmatter when ready to publish -->

`;

    fs.writeFileSync(filepath, draft);
    console.log(`\nDraft created: ${filepath}`);
    console.log('Paste the AI output into this file, then remove "draft: true" to publish.');
}

// Main execution
console.log('='.repeat(60));
console.log('WEEKLY POST GENERATOR');
console.log('='.repeat(60));
console.log(`Date range: ${startDate} to ${endDate}\n`);

const commits = readCommits(repoPath);
console.log(`Found ${commits.length} total commits`);

const filtered = filterCommits(commits);
console.log(`After filtering: ${filtered.length} commits for blog\n`);

if (filtered.length === 0) {
    console.log('No commits to include in the weekly post.');
    console.log('Make sure your commits include Blog-Intent and Confidentiality trailers.');
    process.exit(0);
}

// Generate and output the prompt
const fullPrompt = generateFullPrompt(filtered, startDate, endDate);

console.log('='.repeat(60));
console.log('COPY THE FOLLOWING PROMPT TO CLAUDE/CHATGPT:');
console.log('='.repeat(60));
console.log(fullPrompt);
console.log('='.repeat(60));

if (writeDraft) {
    createDraftFile(startDate, endDate);
}

// Also save to file for convenience
const promptFile = path.join(repoPath, 'weekly_prompt.txt');
fs.writeFileSync(promptFile, fullPrompt);
console.log(`\nPrompt also saved to: ${promptFile}`);
console.log('\nNext steps:');
console.log('1. Copy the prompt above and paste into Claude or ChatGPT');
console.log('2. Review the generated post');
console.log('3. Save it to src/content/blog/' + endDate + '-weekly-progress.md');
console.log('4. Commit and push when ready');
