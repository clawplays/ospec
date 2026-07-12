const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_BASELINE_REF = 'HEAD';
const REQUIRED_CODE = 'OSPEC-BENCH-017';
const DEFAULT_OUTPUT = path.join(
  PROJECT_ROOT,
  '.local',
  'context-efficiency-results.json',
);

const SCENARIOS = [
  { name: 'small', fillerBytesPerDocument: 4_000 },
  { name: 'medium', fillerBytesPerDocument: 12_000 },
  { name: 'large', fillerBytesPerDocument: 24_000 },
];

function parseArguments(argv) {
  const options = {
    live: false,
    model: null,
    output: DEFAULT_OUTPUT,
    repetitions: 1,
    reasoningEffort: 'low',
    baselineRef: DEFAULT_BASELINE_REF,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--live') options.live = true;
    else if (argument === '--model') options.model = argv[++index] || null;
    else if (argument === '--output')
      options.output = path.resolve(argv[++index] || DEFAULT_OUTPUT);
    else if (argument === '--repetitions')
      options.repetitions = Number.parseInt(argv[++index] || '1', 10);
    else if (argument === '--reasoning-effort')
      options.reasoningEffort = argv[++index] || 'low';
    else if (argument === '--baseline-ref')
      options.baselineRef = argv[++index] || DEFAULT_BASELINE_REF;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (
    !Number.isInteger(options.repetitions) ||
    options.repetitions < 1 ||
    options.repetitions > 10
  ) {
    throw new Error('--repetitions must be an integer from 1 to 10.');
  }
  if (options.live && !options.model) {
    throw new Error(
      '--live requires an explicit --model for reproducible A/B samples.',
    );
  }
  return options;
}

function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd: options.cwd || PROJECT_ROOT,
    encoding: 'utf8',
    env: options.env || process.env,
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(
      [
        `${command} ${args.join(' ')} failed with exit code ${result.status}.`,
        result.error?.stack || result.error?.message,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }
  return result.stdout;
}

function baselineFiles(baselineRef) {
  return run('git', ['ls-tree', '-r', '--name-only', baselineRef, 'dist'])
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractBaselineRuntime(runtimeRoot, baselineRef) {
  for (const relativePath of baselineFiles(baselineRef)) {
    const content = childProcess.execFileSync(
      'git',
      ['show', `${baselineRef}:${relativePath}`],
      {
        cwd: PROJECT_ROOT,
        encoding: null,
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true,
      },
    );
    const destination = path.join(runtimeRoot, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content);
  }
}

function repeatToBytes(prefix, targetBytes) {
  const lines = [];
  let bytes = 0;
  for (let index = 1; bytes < targetBytes; index += 1) {
    const line = `${prefix} ${String(index).padStart(4, '0')}: unrelated compatibility note for benchmark corpus.\n`;
    lines.push(line);
    bytes += Buffer.byteLength(line);
  }
  return lines.join('');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeFixture(projectRoot, scenario) {
  const changeRoot = path.join(
    projectRoot,
    'changes',
    'active',
    `context-${scenario.name}`,
  );
  const agentsRoot = path.join(changeRoot, 'artifacts', 'agents');
  fs.mkdirSync(agentsRoot, { recursive: true });
  fs.mkdirSync(path.join(projectRoot, 'src'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, 'docs', 'project'), { recursive: true });
  writeJson(path.join(projectRoot, '.skillrc'), { mode: 'full' });
  writeJson(path.join(projectRoot, 'SKILL.index.json'), {
    version: '1.0',
    documents: [
      {
        path: 'docs/project/request-policy.md',
        title: 'Request policy',
        summary: 'Header normalization behavior.',
      },
    ],
  });
  fs.writeFileSync(
    path.join(projectRoot, 'docs', 'project', 'feature-index.md'),
    '# Feature Index\n\n- Request policy: `docs/project/request-policy.md`\n',
  );
  fs.writeFileSync(
    path.join(projectRoot, 'docs', 'project', 'request-policy.md'),
    `# Request Policy\n\n${REQUIRED_CODE}: blank or whitespace-only request IDs normalize to null.\n`,
  );

  const requirement = `${REQUIRED_CODE}: blank or whitespace-only request IDs must normalize to null, while non-empty IDs are trimmed.`;
  const documentBodies = {
    'proposal.md': `# Proposal\n\n${requirement}\n\n`,
    'design.md':
      '# Design\n\nNormalize at the request boundary before downstream validation.\n\n',
    'implementation-plan.md':
      '# Implementation Plan\n\nAudit the request ID normalizer and report any contract mismatch.\n\n',
    'tasks.md': '# Tasks\n\n- [ ] Audit request ID normalization.\n\n',
  };
  for (const [name, header] of Object.entries(documentBodies)) {
    fs.writeFileSync(
      path.join(changeRoot, name),
      `${header}${repeatToBytes(name, scenario.fillerBytesPerDocument)}`,
    );
  }
  fs.writeFileSync(
    path.join(projectRoot, 'src', 'request-policy.js'),
    [
      'function normalizeRequestId(value) {',
      "  if (typeof value !== 'string') return null;",
      '  return value.trim();',
      '}',
      '',
      'module.exports = { normalizeRequestId };',
      '',
    ].join('\n'),
  );
  writeJson(path.join(agentsRoot, 'task-graph.json'), {
    version: '1.0',
    feature: `context-${scenario.name}`,
    status: 'pending',
    global_constraints: [
      'Read-only benchmark: do not edit files.',
      'Preserve non-empty request ID trimming.',
    ],
    optional_steps: [],
    generated_from: [
      'proposal.md',
      'design.md',
      'implementation-plan.md',
      'tasks.md',
    ],
    tasks: [
      {
        id: 'task-audit',
        title: 'Audit request ID normalization against the accepted contract',
        status: 'PENDING',
        depends_on: [],
        parallelizable: false,
        conflicts_with: [],
        target_files: ['src/request-policy.js'],
        verification_commands: ['node -e "process.exit(0)"'],
        expected_result: `Identify whether the implementation satisfies ${REQUIRED_CODE}.`,
        context: requirement,
        interfaces: [
          'Input: unknown request ID value.',
          'Output: trimmed non-empty string or null.',
        ],
        documentation_updates: [],
        worker_role: 'implementer',
      },
    ],
  });

  run('git', ['init', '--quiet'], { cwd: projectRoot });
  run('git', ['config', 'user.email', 'benchmark@example.test'], {
    cwd: projectRoot,
  });
  run('git', ['config', 'user.name', 'OSpec Benchmark'], { cwd: projectRoot });
  run('git', ['add', '.'], { cwd: projectRoot });
  run('git', ['commit', '--quiet', '-m', 'benchmark fixture'], {
    cwd: projectRoot,
  });
  return changeRoot;
}

function instrumentMethods(instance, methodNames) {
  const profile = {};
  for (const methodName of methodNames) {
    const original = instance[methodName];
    if (typeof original !== 'function') continue;
    profile[methodName] = { calls: 0, durationMs: 0 };
    instance[methodName] = function instrumentedMethod(...args) {
      const startedAt = performance.now();
      profile[methodName].calls += 1;
      try {
        const result = original.apply(this, args);
        if (result && typeof result.finally === 'function') {
          return result.finally(() => {
            profile[methodName].durationMs += performance.now() - startedAt;
          });
        }
        profile[methodName].durationMs += performance.now() - startedAt;
        return result;
      } catch (error) {
        profile[methodName].durationMs += performance.now() - startedAt;
        throw error;
      }
    };
  }
  return profile;
}

async function createPacket(runtimeRoot, projectRoot, scenario) {
  const changeRoot = writeFixture(projectRoot, scenario);
  const { FileService } = require(
    path.join(runtimeRoot, 'dist', 'services', 'FileService.js'),
  );
  const { TaskGraphExecutionService } = require(
    path.join(runtimeRoot, 'dist', 'services', 'TaskGraphExecutionService.js'),
  );
  const service = new TaskGraphExecutionService(new FileService());
  const profile = instrumentMethods(service, [
    'getReport',
    'readBootstrapProjectSessionSnapshot',
    'runGit',
    'readGitOutput',
    'recordExecutionMetric',
    'recordExecutionMetrics',
    'syncWorkerStatus',
    'planLaunch',
  ]);
  const startedAt = performance.now();
  const dispatch = await service.dispatch(changeRoot, { taskId: 'task-audit' });
  const durationMs = performance.now() - startedAt;
  const packetPath = path.join(changeRoot, dispatch.dispatches[0].packetPath);
  const packet = fs.readFileSync(packetPath, 'utf8');
  const coreDocuments = [
    'proposal.md',
    'design.md',
    'implementation-plan.md',
    'tasks.md',
    path.join('artifacts', 'agents', 'task-graph.json'),
  ];
  return {
    changeRoot,
    packet,
    packetPath,
    packetRelativePath: path
      .relative(projectRoot, packetPath)
      .replace(/\\/g, '/'),
    packetBytes: Buffer.byteLength(packet),
    generationDurationMs: durationMs,
    profile,
    requiredCorpusBytes: coreDocuments.reduce(
      (total, file) => total + fs.statSync(path.join(changeRoot, file)).size,
      0,
    ),
  };
}

function writeOutputSchema(projectRoot) {
  const schemaPath = path.join(projectRoot, 'benchmark-output.schema.json');
  writeJson(schemaPath, {
    type: 'object',
    additionalProperties: false,
    properties: {
      verdict: { type: 'string', enum: ['DEFECT_FOUND', 'NO_DEFECT'] },
      requirement_code: { type: 'string' },
      target_file: { type: 'string' },
      finding: { type: 'string' },
      consulted_files: { type: 'array', items: { type: 'string' } },
    },
    required: [
      'verdict',
      'requirement_code',
      'target_file',
      'finding',
      'consulted_files',
    ],
  });
  return schemaPath;
}

function parseJsonEvents(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('{'))
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function summarizeToolCalls(events) {
  return events
    .filter((event) => event.type === 'item.completed')
    .map((event) => event.item)
    .filter((item) => item && item.type !== 'agent_message')
    .map((item) => ({
      type: item.type,
      command: typeof item.command === 'string' ? item.command : null,
      status: item.status || null,
    }));
}

function runLiveSample(input, options, repetition) {
  const schemaPath = writeOutputSchema(input.projectRoot);
  const outputPath = path.join(
    input.projectRoot,
    `benchmark-response-${repetition}.json`,
  );
  const prompt = [
    'This is a read-only OSpec context-efficiency benchmark.',
    `Open \`${input.packetRelativePath}\` and follow its Required Context policy exactly.`,
    'If the packet requires all core change documents, read them. If it says the packet is the task brief and only permits on-demand document reads, do not open core change documents because the packet contains the complete requirement.',
    'Inspect the listed target file. Do not edit files or run tests.',
    `Determine whether the implementation satisfies ${REQUIRED_CODE}.`,
    'Return only the requested structured result. List every file you actually consulted.',
  ].join('\n');
  const args = [
    'exec',
    '--json',
    '--sandbox',
    'read-only',
    '--output-schema',
    schemaPath,
    '-o',
    outputPath,
    '-c',
    `model_reasoning_effort="${options.reasoningEffort}"`,
  ];
  if (options.model) args.push('--model', options.model);
  args.push(prompt);
  const childEnvironment = { ...process.env };
  delete childEnvironment.CODEX_THREAD_ID;
  const startedAt = performance.now();
  const managedPackageRoot = process.env.CODEX_MANAGED_PACKAGE_ROOT;
  const codexEntry = managedPackageRoot
    ? path.join(managedPackageRoot, 'bin', 'codex.js')
    : null;
  const command =
    codexEntry && fs.existsSync(codexEntry) ? process.execPath : 'codex';
  const commandArguments =
    codexEntry && fs.existsSync(codexEntry) ? [codexEntry, ...args] : args;
  const stdout = run(command, commandArguments, {
    cwd: input.projectRoot,
    env: childEnvironment,
  });
  const elapsedMs = performance.now() - startedAt;
  const events = parseJsonEvents(stdout);
  const completion = [...events]
    .reverse()
    .find((event) => event.type === 'turn.completed');
  const responseText = fs.readFileSync(outputPath, 'utf8').trim();
  let response = null;
  try {
    response = JSON.parse(responseText);
  } catch {
    response = { parse_error: responseText };
  }
  const qualityPassed =
    response?.verdict === 'DEFECT_FOUND' &&
    response?.requirement_code === REQUIRED_CODE &&
    response?.target_file?.replace(/\\/g, '/') === 'src/request-policy.js' &&
    /null|blank|whitespace/i.test(response?.finding || '');
  return {
    repetition,
    elapsedMs,
    usage: completion?.usage || null,
    toolCalls: summarizeToolCalls(events),
    response,
    qualityPassed,
  };
}

function median(values) {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}

function statistics(values) {
  if (values.length === 0) {
    return {
      count: 0,
      mean: null,
      median: null,
      min: null,
      max: null,
      standardDeviation: null,
      confidence95: null,
    };
  }
  const mean =
    values.reduce((total, value) => total + value, 0) / values.length;
  const variance =
    values.length > 1
      ? values.reduce((total, value) => total + (value - mean) ** 2, 0) /
        (values.length - 1)
      : 0;
  const standardDeviation = Math.sqrt(variance);
  const tCritical =
    {
      2: 12.706,
      3: 4.303,
      4: 3.182,
      5: 2.776,
      6: 2.571,
      7: 2.447,
      8: 2.365,
      9: 2.306,
      10: 2.262,
    }[values.length] || 1.96;
  const margin =
    values.length > 1
      ? (tCritical * standardDeviation) / Math.sqrt(values.length)
      : null;
  return {
    count: values.length,
    mean,
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
    standardDeviation,
    confidence95:
      margin === null ? null : { low: mean - margin, high: mean + margin },
  };
}

function aggregate(samples) {
  const withUsage = samples.filter((sample) => sample.usage);
  return {
    sampleCount: samples.length,
    usageSampleCount: withUsage.length,
    qualityPassCount: samples.filter((sample) => sample.qualityPassed).length,
    medianElapsedMs: median(samples.map((sample) => sample.elapsedMs)),
    medianInputTokens: median(
      withUsage.map((sample) => sample.usage.input_tokens),
    ),
    medianCachedInputTokens: median(
      withUsage.map((sample) => sample.usage.cached_input_tokens),
    ),
    medianOutputTokens: median(
      withUsage.map((sample) => sample.usage.output_tokens),
    ),
    medianToolCalls: median(samples.map((sample) => sample.toolCalls.length)),
    elapsedMs: statistics(samples.map((sample) => sample.elapsedMs)),
    inputTokens: statistics(
      withUsage.map((sample) => sample.usage.input_tokens),
    ),
    cachedInputTokens: statistics(
      withUsage.map((sample) => sample.usage.cached_input_tokens),
    ),
    outputTokens: statistics(
      withUsage.map((sample) => sample.usage.output_tokens),
    ),
    toolCalls: statistics(samples.map((sample) => sample.toolCalls.length)),
  };
}

function compareSamples(baselineSamples, currentSamples) {
  const currentByRepetition = new Map(
    currentSamples.map((sample) => [sample.repetition, sample]),
  );
  const paired = baselineSamples
    .map((baseline) => ({
      baseline,
      current: currentByRepetition.get(baseline.repetition),
    }))
    .filter((pair) => pair.current);
  const reduction = (baseline, current) =>
    Number.isFinite(baseline) && Number.isFinite(current) && baseline > 0
      ? (1 - current / baseline) * 100
      : null;
  const metric = (reader) =>
    statistics(
      paired
        .map(({ baseline, current }) =>
          reduction(reader(baseline), reader(current)),
        )
        .filter((value) => value !== null),
    );
  return {
    pairedSampleCount: paired.length,
    qualityPreserved: paired.every(
      ({ baseline, current }) =>
        baseline.qualityPassed && current.qualityPassed,
    ),
    inputTokenReductionPercent: metric(
      (sample) => sample.usage?.input_tokens ?? null,
    ),
    outputTokenReductionPercent: metric(
      (sample) => sample.usage?.output_tokens ?? null,
    ),
    elapsedReductionPercent: metric((sample) => sample.elapsedMs),
    toolCallReductionPercent: metric((sample) => sample.toolCalls.length),
  };
}

function benchmarkReviewGitStrategies(projectRoot, repetitions = 7) {
  const baseCommit = run('git', ['rev-parse', 'HEAD'], {
    cwd: projectRoot,
  }).trim();
  const targetFile = 'src/request-policy.js';
  fs.appendFileSync(
    path.join(projectRoot, targetFile),
    '\n// review strategy benchmark workspace change\n',
  );
  const oldCommands = [
    ['status', '--porcelain=v1', '--untracked-files=all'],
    ['rev-parse', '--verify', `${baseCommit}^{commit}`],
    ['rev-parse', 'HEAD'],
    ['log', '--oneline', `${baseCommit}..${baseCommit}`],
    ['diff', '--stat', baseCommit, '--', targetFile],
    ['diff', '--no-ext-diff', '--unified=10', baseCommit, '--', targetFile],
  ];
  const newCommands = [
    [
      'status',
      '--porcelain=v2',
      '--branch',
      '--untracked-files=all',
      '--no-ahead-behind',
    ],
    ['rev-parse', '--verify', `${baseCommit}^{commit}`],
    ['diff', '--stat', baseCommit, '--', targetFile],
    ['diff', '--no-ext-diff', '--unified=10', baseCommit, '--', targetFile],
  ];
  const measureSequence = (commands) => {
    const startedAt = performance.now();
    for (const args of commands) run('git', args, { cwd: projectRoot });
    return performance.now() - startedAt;
  };
  const oldDurationMs = [];
  const newDurationMs = [];
  for (let repetition = 1; repetition <= repetitions; repetition += 1) {
    const oldFirst = repetition % 2 === 1;
    if (oldFirst) {
      oldDurationMs.push(measureSequence(oldCommands));
      newDurationMs.push(measureSequence(newCommands));
    } else {
      newDurationMs.push(measureSequence(newCommands));
      oldDurationMs.push(measureSequence(oldCommands));
    }
  }
  const oldMedianMs = median(oldDurationMs);
  const newMedianMs = median(newDurationMs);
  return {
    repetitions,
    order: 'alternating',
    oldProcessCount: oldCommands.length,
    newProcessCount: newCommands.length,
    oldMedianMs,
    newMedianMs,
    reductionPercent:
      oldMedianMs && newMedianMs ? (1 - newMedianMs / oldMedianMs) * 100 : null,
    oldDurationMs,
    newDurationMs,
  };
}

function runHookContext(scriptPath, event, cwd) {
  const result = childProcess.spawnSync('node', [scriptPath], {
    cwd: PROJECT_ROOT,
    input: JSON.stringify({ cwd, hook_event_name: event }),
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(`Hook benchmark failed for ${event}: ${result.stderr}`);
  }
  const output = result.stdout.trim();
  if (!output) return 0;
  const payload = JSON.parse(output);
  return Buffer.byteLength(
    payload?.hookSpecificOutput?.additionalContext || '',
    'utf8',
  );
}

function benchmarkHookContext(runRoot, baselineRef) {
  const baselineScript = path.join(runRoot, 'baseline-ospec-claude-hook.cjs');
  fs.writeFileSync(
    baselineScript,
    childProcess.execFileSync(
      'git',
      ['show', `${baselineRef}:assets/hooks/claude/ospec-claude-hook.cjs`],
      { cwd: PROJECT_ROOT, encoding: null, windowsHide: true },
    ),
  );
  const currentScript = path.join(
    PROJECT_ROOT,
    'assets',
    'hooks',
    'claude',
    'ospec-claude-hook.cjs',
  );
  const fixtureRoot = path.join(runRoot, 'hook-context-fixture');
  fs.mkdirSync(fixtureRoot, { recursive: true });
  const measure = (scriptPath, turns) => {
    const contextBytesByTurn = [];
    for (let turn = 1; turn <= turns; turn += 1) {
      contextBytesByTurn.push(
        runHookContext(
          scriptPath,
          turn === 1 ? 'SessionStart' : 'UserPromptSubmit',
          fixtureRoot,
        ),
      );
    }
    return {
      directInjectedBytes: contextBytesByTurn.reduce(
        (total, value) => total + value,
        0,
      ),
      retainedInputBytes: contextBytesByTurn.reduce(
        (total, value, index) => total + value * (turns - index),
        0,
      ),
      nonEmptyEvents: contextBytesByTurn.filter((value) => value > 0).length,
      contextBytesByTurn,
    };
  };
  return [10, 20, 40].map((turns) => {
    const baseline = measure(baselineScript, turns);
    const current = measure(currentScript, turns);
    return {
      turns,
      baseline,
      current,
      directReductionPercent:
        (1 - current.directInjectedBytes / baseline.directInjectedBytes) * 100,
      retainedInputReductionPercent:
        (1 - current.retainedInputBytes / baseline.retainedInputBytes) * 100,
    };
  });
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  fs.mkdirSync(path.join(PROJECT_ROOT, '.local'), { recursive: true });
  const runRoot = fs.mkdtempSync(
    path.join(PROJECT_ROOT, '.local', 'ospec-context-benchmark-'),
  );
  const baselineRuntime = path.join(runRoot, 'baseline-runtime');
  const baselineCommit = run('git', [
    'rev-parse',
    `${options.baselineRef}^{commit}`,
  ]).trim();
  extractBaselineRuntime(baselineRuntime, baselineCommit);
  const result = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    baselineRef: options.baselineRef,
    baselineCommit,
    currentCommit: run('git', ['rev-parse', 'HEAD']).trim(),
    currentWorktreeDirty:
      run('git', ['status', '--porcelain=v1']).trim().length > 0,
    live: options.live,
    repetitions: options.repetitions,
    model: options.model || null,
    reasoningEffort: options.reasoningEffort,
    scenarios: [],
  };

  try {
    for (const [scenarioIndex, scenario] of SCENARIOS.entries()) {
      const scenarioResult = { ...scenario, variants: [] };
      const variantRuns = new Map();
      for (const variant of ['baseline', 'current']) {
        const projectRoot = path.join(runRoot, `${scenario.name}-${variant}`);
        fs.mkdirSync(projectRoot, { recursive: true });
        const runtimeRoot =
          variant === 'baseline' ? baselineRuntime : PROJECT_ROOT;
        const packet = await createPacket(runtimeRoot, projectRoot, scenario);
        variantRuns.set(variant, { projectRoot, packet, samples: [] });
      }
      if (options.live) {
        for (
          let repetition = 1;
          repetition <= options.repetitions;
          repetition += 1
        ) {
          const baselineFirst = (scenarioIndex + repetition) % 2 === 1;
          const order = baselineFirst
            ? ['baseline', 'current']
            : ['current', 'baseline'];
          for (const variant of order) {
            const runState = variantRuns.get(variant);
            runState.samples.push(
              runLiveSample(
                {
                  projectRoot: runState.projectRoot,
                  packetRelativePath: runState.packet.packetRelativePath,
                },
                options,
                repetition,
              ),
            );
          }
        }
      }
      for (const variant of ['baseline', 'current']) {
        const { packet, samples } = variantRuns.get(variant);
        scenarioResult.variants.push({
          variant,
          packetBytes: packet.packetBytes,
          requiredCorpusBytes: packet.requiredCorpusBytes,
          generationDurationMs: packet.generationDurationMs,
          generationProfile: packet.profile,
          packetRequiresBroadRead: packet.packet.includes(
            'Read `proposal.md`, `design.md`, `implementation-plan.md`, `tasks.md`, and `artifacts/agents/task-graph.json` before editing.',
          ),
          samples,
          aggregate: aggregate(samples),
        });
      }
      scenarioResult.comparison = compareSamples(
        variantRuns.get('baseline').samples,
        variantRuns.get('current').samples,
      );
      result.scenarios.push(scenarioResult);
    }
    result.reviewGitStrategy = benchmarkReviewGitStrategies(
      path.join(runRoot, 'medium-current'),
    );
    result.hookContextStrategy = benchmarkHookContext(runRoot, baselineCommit);
  } finally {
    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    fs.writeFileSync(options.output, `${JSON.stringify(result, null, 2)}\n`);
    fs.rmSync(runRoot, { recursive: true, force: true });
  }
  process.stdout.write(`${options.output}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message || error}\n`);
  process.exitCode = 1;
});
