"use strict";

const RAW_BASE = 'https://raw.githubusercontent.com/harvard-edge/cs249r_book/main/book/quarto/contents';
const FETCH_TIMEOUT_MS = 20000;
const MAX_CHAPTER_CHARS = 3000;  // per chapter, post-strip
const MAX_CONTEXT_CHARS = 2500;  // total returned to agent per run

// ── Chapter index — all 32 chapters with keyword routing ──────────────
const CHAPTERS = {
    // Volume 1: Build, Optimize, Deploy
    introduction:              { vol: 1, title: 'Introduction to ML Systems',    keywords: ['introduction','overview','ml systems','machine learning system','primer','what is ml'] },
    ml_workflow:               { vol: 1, title: 'ML Workflow',                   keywords: ['workflow','pipeline','lifecycle','end to end','ml process','steps'] },
    ml_systems:                { vol: 1, title: 'ML Systems',                    keywords: ['ml systems','system design','systems thinking','infrastructure stack'] },
    nn_computation:            { vol: 1, title: 'Neural Network Computation',    keywords: ['computation','compute','matrix multiply','tensor','flops','arithmetic intensity','ops'] },
    nn_architectures:          { vol: 1, title: 'NN Architectures',              keywords: ['architecture','neural network','cnn','rnn','lstm','transformer','attention','bert','gpt','vit','resnet','layer'] },
    training:                  { vol: 1, title: 'Model Training',                keywords: ['training','backpropagation','gradient','optimizer','adam','sgd','loss function','batch','epoch','overfitting','regularization','learning rate'] },
    data_engineering:          { vol: 1, title: 'Data Engineering',              keywords: ['data engineering','dataset','data pipeline','etl','preprocessing','augmentation','labeling','annotation','feature'] },
    data_selection:            { vol: 1, title: 'Data Selection',                keywords: ['data selection','active learning','data quality','curation','sampling','data efficiency','coreset'] },
    model_compression:         { vol: 1, title: 'Model Compression',             keywords: ['compression','quantization','pruning','knowledge distillation','distill','sparse','efficient model','lightweight','tinyml','int8','fp16'] },
    hw_acceleration:           { vol: 1, title: 'Hardware Acceleration',         keywords: ['hardware','acceleration','gpu','npu','tpu','fpga','asic','chip','silicon','cuda','opencl','dsp','neural processing unit','hardware design'] },
    frameworks:                { vol: 1, title: 'ML Frameworks',                 keywords: ['framework','pytorch','tensorflow','keras','onnx','tflite','jax','mxnet','runtime','compiler','xla','triton'] },
    ml_ops:                    { vol: 1, title: 'ML Ops',                        keywords: ['mlops','ml ops','monitoring','data drift','model drift','versioning','experiment tracking','mlflow','wandb','ci cd ml','deployment ops','model registry'] },
    model_serving:             { vol: 1, title: 'Model Serving',                 keywords: ['serving','model serving','triton','torchserve','endpoint','api serving','model api','production model','request batching','kv cache','vllm'] },
    benchmarking:              { vol: 1, title: 'Benchmarking',                  keywords: ['benchmark','benchmarking','evaluation','metric','profiling','mlperf','roofline','latency','throughput','accuracy tradeoff'] },
    responsible_engr:          { vol: 1, title: 'Responsible Engineering',       keywords: ['responsible','ethics','bias','fairness','transparency','explainability','accountability','trustworthy ai','interpretability'] },
    // Volume 2: Scale, Distribute, Govern
    collective_communication:  { vol: 2, title: 'Collective Communication',      keywords: ['collective communication','allreduce','ring allreduce','mpi','nccl','broadcast','gradient synchronization','communication overhead'] },
    compute_infrastructure:    { vol: 2, title: 'Compute Infrastructure',        keywords: ['infrastructure','compute cluster','data center','cloud computing','hpc','kubernetes','slurm','resource allocation','job scheduling'] },
    data_storage:              { vol: 2, title: 'Data Storage',                  keywords: ['storage','file system','nfs','hdfs','s3','object store','distributed storage','checkpointing','checkpoint','io bottleneck'] },
    distributed_training:      { vol: 2, title: 'Distributed Training',          keywords: ['distributed training','data parallel','model parallel','pipeline parallel','megatron','deepspeed','multi node','multi gpu','tensor parallel','zero'] },
    edge_intelligence:         { vol: 2, title: 'Edge Intelligence',             keywords: ['edge','embedded','iot','microcontroller','raspberry','jetson','mobile','on device','tinyml','wasm','edge ai','edge inference','mcu'] },
    fault_tolerance:           { vol: 2, title: 'Fault Tolerance',               keywords: ['fault tolerance','resilience','reliability','recovery','failure','redundancy','replication','ckpt','elastic training'] },
    fleet_orchestration:       { vol: 2, title: 'Fleet Orchestration',           keywords: ['fleet','orchestration','fleet orchestration','scheduler','resource management','multi tenant','capacity planning','heterogeneous'] },
    inference:                 { vol: 2, title: 'Inference at Scale',            keywords: ['inference at scale','batching','speculative decoding','continuous batching','llm inference','decode','prefill','token generation','serving latency'] },
    network_fabrics:           { vol: 2, title: 'Network Fabrics',               keywords: ['network fabric','infiniband','ethernet','roce','nvlink','nvswitch','interconnect','topology','bandwidth','network bandwidth'] },
    ops_scale:                 { vol: 2, title: 'Ops at Scale',                  keywords: ['ops at scale','operations','production ops','incident','oncall','observability','logging at scale','alerting','runbook'] },
    performance_engineering:   { vol: 2, title: 'Performance Engineering',       keywords: ['performance engineering','profiling','optimization','bottleneck','memory bandwidth','compute bound','memory bound','kernel fusion','operator fusion'] },
    responsible_ai:            { vol: 2, title: 'Responsible AI',                keywords: ['responsible ai','governance','regulation','compliance','safety','alignment','red team','harm','policy','ai governance'] },
    robust_ai:                 { vol: 2, title: 'Robust AI',                     keywords: ['robust','adversarial robustness','robustness','out of distribution','ood','uncertainty','calibration','adversarial examples'] },
    security_privacy:          { vol: 2, title: 'Security & Privacy',            keywords: ['security','privacy','threat model','adversarial attack','membership inference','model extraction','model stealing','poisoning','backdoor','differential privacy'] },
    sustainable_ai:            { vol: 2, title: 'Sustainable AI',                keywords: ['sustainable','carbon','energy consumption','green ai','co2 emissions','efficiency','environmental impact','carbon footprint'] },
};

// Trigger: only activate book lookup for clearly ML/AI-related objectives
const ML_TRIGGER = /\b(model|neural|train(?:ing)?|inference|gpu|quantiz|prun|distill|embed|vector|transformer|attention|llm|machine.?learning|deep.?learning|ai.?system|ml.?pipeline|edge.?ai|tinyml|benchmark|mlops|hardware.?accel|data.?engineer|distributed.?train|model.?serv|compress|federat|responsible.?ai|robust|adversar|sustainable.?ai|compute.?cluster|fault.?toler|fleet|kv.?cache|data.?parallel|speculative|roofline|backprop|gradient)\b/i;

// In-process cache — prevents re-fetching same chapter within a session
const _cache = new Map();

// Build the raw GitHub URL for a chapter key
function _rawUrl(chapterKey) {
    const ch = CHAPTERS[chapterKey];
    if (!ch) return null;
    return `${RAW_BASE}/vol${ch.vol}/${chapterKey}/${chapterKey}.qmd`;
}

// Strip Quarto-specific syntax, leaving clean prose markdown
function _stripQuarto(text) {
    return text
        .replace(/^---[\s\S]*?---\n?/m, '')           // YAML frontmatter
        .replace(/^:::\s*\{[^}]*\}[\s\S]*?^:::/gm, '') // callout/div blocks
        .replace(/^:::\s*$/gm, '')                     // lone ::: markers
        .replace(/^#\|.*$/gm, '')                      // code chunk options
        .replace(/@(sec|fig|tbl|eq|lst|def|exm|thm)-[\w-]+/g, '')  // cross-refs
        .replace(/!\[[^\]]*\]\([^)]*\)\{[^}]*\}/g, '') // figures with attrs
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')           // plain images
        .replace(/<!--[\s\S]*?-->/g, '')                // HTML comments
        .replace(/\{[^}]{0,60}\}/g, '')                 // remaining attr blocks
        .replace(/\n{3,}/g, '\n\n')                     // collapse blank lines
        .trim();
}

// Find the top N chapters matching an objective by keyword scoring
function findRelevantChapters(objective, topN = 3) {
    const lower = objective.toLowerCase();
    return Object.entries(CHAPTERS)
        .map(([key, ch]) => ({
            key,
            title: ch.title,
            vol:   ch.vol,
            score: ch.keywords.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0)
        }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topN);
}

// Fetch and clean a single chapter — with timeout and in-process cache
async function fetchChapter(chapterKey) {
    if (_cache.has(chapterKey)) return _cache.get(chapterKey);
    const url = _rawUrl(chapterKey);
    if (!url) return null;
    try {
        const res = await Promise.race([
            fetch(url, { headers: { 'User-Agent': 'apex-ai-os/1.0 (cs249r-reader)' } }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('chapter fetch timeout')), FETCH_TIMEOUT_MS))
        ]);
        if (!res.ok) { console.warn(`[CS249R] ${chapterKey} returned HTTP ${res.status}`); return null; }
        const raw  = await res.text();
        const clean = _stripQuarto(raw).slice(0, MAX_CHAPTER_CHARS);
        _cache.set(chapterKey, clean);
        return clean;
    } catch (e) {
        console.warn(`[CS249R] fetch failed for ${chapterKey}:`, e.message);
        return null;
    }
}

// Main entry — called by wiki-reader when a task objective is ML-related.
// Returns up to MAX_CONTEXT_CHARS of the most relevant chapter content.
async function getBookContext(objective) {
    if (!objective || !ML_TRIGGER.test(objective)) return '';
    const matches = findRelevantChapters(objective, 2);
    if (!matches.length) return '';
    console.log(`[CS249R] matched for "${objective.slice(0,60)}": ${matches.map(m => m.key).join(', ')}`);
    const fetched = await Promise.all(matches.map(m => fetchChapter(m.key)));
    const parts = matches
        .map((m, i) => fetched[i]
            ? `### CS249R Vol${m.vol}: ${m.title}\n${fetched[i].slice(0, 1200)}`
            : null)
        .filter(Boolean);
    return parts.length
        ? `*Source: CS249R Machine Learning Systems — mlsysbook.ai*\n\n${parts.join('\n\n---\n\n')}`.slice(0, MAX_CONTEXT_CHARS)
        : '';
}

// One-time full vault ingest — writes all chapters to References/CS249R/ in Obsidian
async function ingestAllToVault(memory) {
    const entries = Object.entries(CHAPTERS);
    let succeeded = 0, failed = 0;
    for (const [key, ch] of entries) {
        try {
            console.log(`[CS249R] ingesting ${key}...`);
            const content = await fetchChapter(key);
            if (!content) { failed++; continue; }
            memory.write(
                `09 Knowledge/CS249R/vol${ch.vol}/${key}.md`,
                `# ${ch.title}\n\n` +
                `*Source: CS249R Machine Learning Systems (Harvard Edge) — https://mlsysbook.ai*\n` +
                `*Keywords: ${ch.keywords.slice(0, 6).join(', ')}*\n\n${content}`
            );
            succeeded++;
            await new Promise(r => setTimeout(r, 400)); // gentle rate-limit
        } catch { failed++; }
    }
    // Write index note
    const vol1 = entries.filter(([,c]) => c.vol === 1).map(([k,c]) => `- [[vol1/${k}|${c.title}]]`).join('\n');
    const vol2 = entries.filter(([,c]) => c.vol === 2).map(([k,c]) => `- [[vol2/${k}|${c.title}]]`).join('\n');
    memory.write('09 Knowledge/CS249R/INDEX.md',
        `# CS249R: Machine Learning Systems\n\n` +
        `*Harvard Edge AI Research Group — https://mlsysbook.ai*\n\n` +
        `> Comprehensive textbook on building, optimizing, and deploying ML systems.\n` +
        `> 32 chapters across two volumes. Integrated into Apex agent context for ML-related tasks.\n\n` +
        `## Volume 1: Build, Optimize, Deploy\n${vol1}\n\n` +
        `## Volume 2: Scale, Distribute, Govern\n${vol2}`
    );
    console.log(`[CS249R] Vault ingest done — ${succeeded} OK, ${failed} failed`);
    return { succeeded, failed, total: entries.length };
}

module.exports = { getBookContext, findRelevantChapters, fetchChapter, ingestAllToVault, CHAPTERS, ML_TRIGGER };
