# Research Component — System Specification & Functional Guide

> **Dual-Pane Research Environment | AI-Assisted Note Generation | Active Recall & Assessment**

---

## 1. System Overview

The Research Component is a dual-pane, AI-assisted knowledge environment designed to streamline the full research lifecycle — from raw resource ingestion and intelligent synthesis through to active recall and formal assessment. It consolidates four major workflows into a single coherent interface: resource management, note generation, concept simplification, and interactive testing.

> **Design Philosophy**
> Every element of the interface is built around a single principle: the relationship between source material and synthesised output must remain transparent and immediately accessible. The dual-pane layout enforces this at the structural level.

---

## 2. Interface Structure

### 2.1 Initial Configuration

When a new project is created, the user is prompted to supply two pieces of metadata before the workspace opens:

- **Project Name** — identifies the research topic or unit of study.
- **Author** — records who is responsible for the document.

These values are stored in the document header and can be referenced throughout the research session.

---

### 2.2 Dual-Pane Layout

The workspace is permanently split into two side-by-side windows. Neither pane can be hidden, ensuring the link between source material and derived output is always visible.

| Pane | Name | Purpose | Key Sections |
|------|------|---------|--------------|
| Left | Resources | Houses all uploaded source materials. | Scheme · Notes · Images |
| Right | Document | Contains the active research document where synthesis takes place. | Free-form writing area driven by the Smart Space menu. |

---

### 2.3 Resource Pane — Section Management

The left pane is dynamic. Users can expand it by clicking the **+** icon beside the Resource heading to append new sections under three established categories:

- **Scheme** — structural outlines, diagrams, or concept maps.
- **Notes** — raw written material, clippings, or pre-existing summaries.
- **Images** — visual assets relevant to the research topic.

Clicking any category heading opens the upload interface for that data type.

In addition to file uploads, users can add web-based resources directly to any section:

- **Website URL** — the system ingests the page content for AI reference.
- **YouTube Video** — the system extracts transcript and metadata for AI reference.

---

## 3. The Smart Space Menu

The Smart Space is the primary interaction mechanism within the Document pane. It is triggered by either:

- **Long-press** (touch screen) on an empty area of the document.
- **Right-click** (mouse/trackpad) on an empty area of the document.

A contextual popup menu appears, offering the following AI-assisted actions localised to the selected position:

| Menu Option | What It Does |
|-------------|-------------|
| **Generate Notes** | Automatically populates the cursor position with structured notes derived from the uploaded resources, using the parameters set in the Note Configuration dialogue. |
| **Simplify** | Rewrites selected or upcoming text in more accessible language while preserving meaning. |
| **Q&A (Contextual Inquiry)** | Opens a real-time interrogation panel, allowing the user to ask questions answered strictly from the uploaded resources. |

---

## 4. Note Generation — Configuration & Refinement

### 4.1 The Note Configuration Dialogue

When **Generate Notes** is selected from the Smart Space menu, a modal dialogue appears before any content is produced. The dialogue requires the user to define three parameters:

---

#### A. AI Approach (Data Source Logic)

Determines what information the AI draws upon when drafting notes:

| Approach | Data Source |
|----------|-------------|
| **Resource Grounded** | Closed system. The AI uses only the files uploaded to this project — no external knowledge. |
| **Resource & Knowledge** | The AI synthesises uploaded resources with its own pre-trained internal knowledge for broader context. |
| **Resource, Knowledge & Internet** | The AI combines uploaded files, internal knowledge, and real-time web data for the most current and expansive output. |

---

#### B. Audience — Age Group

A dropdown menu sets the target age demographic. The AI adjusts vocabulary complexity, sentence structure, and explanatory depth to match the specified group.

---

#### C. Note Type (Structural Density)

Controls the depth and format of the generated output:

| Note Type | Output Characteristics |
|-----------|----------------------|
| **Deep** | Exhaustive and thoroughly explained content. Suitable for advanced study or professional mastery. |
| **Context** | No-frills core data only. Essential facts without supplementary explanation or examples. |
| **Exemplary** | Pedagogically focused. Integrates practical examples throughout to clarify abstract concepts. |

---

### 4.2 Post-Generation Refinement — The Selection Bubble

Once notes have been inserted into the Document pane, all generated text remains dynamic. Selecting any portion triggers a localised **Interaction Bubble** containing four refinement tools:

| Tool | Action |
|------|--------|
| **Explain Deep** | Expands the selected passage with granular analysis of the underlying logic or data. |
| **Simplify** | Rewrites the selection in more accessible language while retaining the original meaning. |
| **Summarise** | Condenses the selected passage into a brief, high-level overview. |
| **Rewrite (Reveal)** | Preserves the core information but completely restructures or reframes the stylistic approach, offering a fresh perspective. |

> **Living Document Principle**
> The combination of configurable generation parameters and post-generation refinement tools means the research document is never a static dump of information. Users retain full control over the 'truth source' while the AI handles structuring and explanation at the chosen level of complexity.

---

## 5. Q&A, Testing & Gamified Assessment

### 5.1 Module Entry

The Q&A module is accessible from the Smart Space menu. On entry, the user selects between two distinct modes:

- **Test** — formal, document-integrated assessment.
- **Quiz** — dynamic, turn-based multiplayer experience.

Both modes share a common configuration layer before diverging into their respective flows.

---

### 5.2 Common Configuration

#### Truth Source Selection

The user must define where the AI draws its questions from:

- **Topic Selection** — the user specifies a topic and, optionally, selects a specific uploaded resource. If a resource is selected, the AI scrapes it to create questions. If none is selected, the AI uses its internal knowledge.
- **Resource** — the AI generates questions exclusively from uploaded documents, with no external knowledge used.

#### Question Type

Two question styles are available, compatible with both Test and Quiz modes:

| Question Type | Cognitive Level |
|---------------|----------------|
| **Knowledge** | Factual recall, definitions, and direct data retrieval. |
| **Comprehension & Logic** | Complex questions requiring the user to apply concepts and demonstrate understanding of how or why something works. |

---

### 5.3 The Test Mode

Test mode is designed for document enrichment and formal assessment preparation.

- **Volume** — supports up to 100 questions per test.
- **Integration** — once generated, all questions are appended directly to the active research document, building a comprehensive study guide or exam paper alongside existing notes.

---

### 5.4 The Quiz Mode

Quiz mode is a dynamic, multiplayer experience optimised for engagement and immediate feedback.

#### Setup Parameters

- **Player Count** — supports 1 to 4 players.
- **Player Names** — individual names are entered for each participant before the session begins.
- **Timer** — a toggleable option that tracks response speed and adds a competitive element.

#### Gameplay Mechanics

- **Turn-Based Queries** — the AI addresses questions to a designated player one at a time.
- **Instant Validation** — as soon as a player submits an answer, the AI marks it as **Correct** or **Wrong**.
- **Corrective Feedback** — for every incorrect answer, the AI immediately reveals the correct response and provides a concise explanation to support in-the-moment learning.

---

### 5.5 Post-Quiz Analytics & Reporting

Upon quiz completion, results are automatically integrated into the research document. The report contains the following components:

| Report Element | Description |
|----------------|-------------|
| **Leaderboard** | A score breakdown for each player (displayed when more than one player participated). |
| **Audit Trail** | A complete list of every question asked, categorised by the player it was directed to. |
| **User Input Record** | The exact answers submitted by each player, preserved verbatim. |
| **Remediation** | For every incorrect answer, the document provides the correct answer and a detailed explanation for future review. |

---

## 6. Integrated Research Workflow

All components function as a coherent, cyclical loop rather than isolated tools. The three phases of this loop are:

| Phase | Action | Tools Used |
|-------|--------|-----------|
| **1. Ingestion** | Resources are uploaded and categorised in the left pane, establishing the truth source for all AI operations. | Resource Pane (Scheme, Notes, Images, URLs, Videos) |
| **2. Synthesis** | Using the Smart Space menu, the user generates structured notes and simplifies complex concepts directly in the Document pane. | Smart Space → Generate Notes, Simplify; Selection Bubble |
| **3. Validation** | The AI leverages the relationship between uploaded resources and the synthesised document to generate targeted questions, ensuring knowledge is tested rather than merely accumulated. | Q&A Module (Test & Quiz modes) |

> **From Resources to Mastery**
> The system is designed so that the final research document is not merely a collection of facts copied from source material. By controlling the AI's data source, generation depth, and assessment parameters, users produce a living document that actively supports mastery rather than passive reading.

---

*Research Component Specification — Version 1.0*
