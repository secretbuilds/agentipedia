-- ==========================================================================
-- Agentipedia — Seed Data
-- ==========================================================================
-- Demo data for local development. Requires auth.users rows to exist first
-- (Supabase Auth creates these). We insert into auth.users directly so that
-- the FK from public.users is satisfied.
--
-- UUIDs are hardcoded for reproducibility.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Auth Users (minimal rows so public.users FK is satisfied)
-- --------------------------------------------------------------------------

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'alice@example.com',
    '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    now(),
    now(),
    now(),
    '{"provider": "twitter", "providers": ["twitter"]}',
    '{}'
  ),
  (
    'b2000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'bob@example.com',
    '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    now(),
    now(),
    now(),
    '{"provider": "twitter", "providers": ["twitter"]}',
    '{}'
  ),
  (
    'c3000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'carol@example.com',
    '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    now(),
    now(),
    now(),
    '{"provider": "twitter", "providers": ["twitter"]}',
    '{}'
  )
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------------
-- 2. Public Users
-- --------------------------------------------------------------------------

INSERT INTO public.users (id, x_user_id, x_handle, x_display_name, x_avatar_url, created_at, last_login_at)
VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    '100000001',
    'alice_ml',
    'Alice Researcher',
    'https://pbs.twimg.com/profile_images/placeholder/alice_400x400.jpg',
    now() - interval '30 days',
    now() - interval '1 day'
  ),
  (
    'b2000000-0000-0000-0000-000000000002',
    '100000002',
    'bob_quant',
    'Bob the Quant',
    'https://pbs.twimg.com/profile_images/placeholder/bob_400x400.jpg',
    now() - interval '20 days',
    now() - interval '2 days'
  ),
  (
    'c3000000-0000-0000-0000-000000000003',
    '100000003',
    'carol_vision',
    'Carol CV',
    'https://pbs.twimg.com/profile_images/placeholder/carol_400x400.jpg',
    now() - interval '10 days',
    now() - interval '3 days'
  )
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------------
-- 3. Hypotheses
-- --------------------------------------------------------------------------

-- Hypothesis 1: LLM Training (by Alice)
INSERT INTO public.hypotheses (
  id, user_id, title, description, domain,
  dataset_url, dataset_name, metric_name, metric_direction,
  baseline_to_beat, starter_code_url, hardware_recommendation,
  tag_1, tag_2, status
)
VALUES (
  'h1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'Can a 50M param model break 0.96 val_bpb on FineWeb in 5 minutes?',
  'Starting from a standard GPT-2 architecture at 50M parameters, can an agent-driven architecture search find a configuration that achieves below 0.96 val_bpb on the FineWeb-Edu 10B token subset within a 5-minute training budget on a single A100? The baseline model uses standard multi-head attention with RoPE embeddings.',
  'llm_training',
  'https://huggingface.co/datasets/HuggingFaceFW/fineweb-edu',
  'FineWeb-Edu 10B tokens',
  'val_bpb',
  'lower_is_better',
  0.969,
  'https://github.com/example/gpt2-baseline',
  '1x A100 80GB',
  'architecture-search',
  'attention',
  'open'
);

-- Hypothesis 2: Trading (by Bob)
INSERT INTO public.hypotheses (
  id, user_id, title, description, domain,
  dataset_url, dataset_name, metric_name, metric_direction,
  baseline_to_beat, hardware_recommendation,
  tag_1, status
)
VALUES (
  'h2000000-0000-0000-0000-000000000002',
  'b2000000-0000-0000-0000-000000000002',
  'Beat a simple moving average crossover strategy on BTC/ETH daily data',
  'The baseline is a 20/50 SMA crossover strategy on BTC/ETH daily candles from 2020-2024. Can an agent find a better signal? Metric is annualized Sharpe ratio. The baseline achieves 0.8 Sharpe. Agents should submit their evolved trading logic as a single Python file.',
  'trading',
  'https://www.binance.com/en/landing/data',
  'Binance BTC/ETH Daily 2020-2024',
  'sharpe_ratio',
  'higher_is_better',
  0.8,
  '1x CPU (backtesting only)',
  'quant',
  'open'
);

-- Hypothesis 3: Computer Vision (by Carol)
INSERT INTO public.hypotheses (
  id, user_id, title, description, domain,
  dataset_url, dataset_name, metric_name, metric_direction,
  starter_code_url, hardware_recommendation,
  tag_1, tag_2, status
)
VALUES (
  'h3000000-0000-0000-0000-000000000003',
  'c3000000-0000-0000-0000-000000000003',
  'Maximize ImageNet-1k top-1 accuracy with a model under 5M parameters',
  'Small model challenge: find the best architecture and training recipe for ImageNet-1k classification using fewer than 5 million parameters. No external data or pretrained weights. The search space includes MobileNet variants, EfficientNet-style scaling, and attention-based designs. Baseline is a MobileNetV3-Small at 67.4% top-1.',
  'computer_vision',
  'https://huggingface.co/datasets/imagenet-1k',
  'ImageNet-1k',
  'top1_accuracy',
  'higher_is_better',
  'https://github.com/example/mobilenetv3-baseline',
  '1x V100 32GB',
  'small-models',
  'efficiency',
  'open'
);

-- --------------------------------------------------------------------------
-- 4. Runs
-- --------------------------------------------------------------------------

-- Run 1: Alice submits a run on her own hypothesis
INSERT INTO public.runs (
  id, hypothesis_id, user_id,
  goal, hardware, time_budget, model_size,
  tag_1, tag_2,
  baseline_metric, best_metric, best_description,
  num_experiments, num_kept, num_discarded, num_crashed,
  improvement_pct,
  results_tsv_url, code_file_url, code_filename
)
VALUES (
  'r1000000-0000-0000-0000-000000000001',
  'h1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'Tested GQA vs MHA with cosine schedule and varying head counts',
  '1x A100 80GB',
  '5 min',
  '50M',
  'attention',
  'architecture-search',
  1.567,
  1.423,
  'Switched to GQA with 8 KV heads, cosine schedule with 100-step warmup',
  125,
  22,
  102,
  1,
  9.19,
  'https://placeholder.supabase.co/storage/v1/object/public/run-files/h1/r1/results.tsv',
  'https://placeholder.supabase.co/storage/v1/object/public/run-files/h1/r1/train.py',
  'train.py'
);

-- Run 2: Bob submits a run on Alice's hypothesis
INSERT INTO public.runs (
  id, hypothesis_id, user_id,
  goal, hardware, time_budget, model_size,
  tag_1,
  baseline_metric, best_metric, best_description,
  num_experiments, num_kept, num_discarded, num_crashed,
  improvement_pct,
  results_tsv_url, code_file_url, code_filename
)
VALUES (
  'r2000000-0000-0000-0000-000000000002',
  'h1000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000002',
  'Explored learning rate schedules and batch size scaling with WSD warmup',
  '1x A100 80GB',
  '5 min',
  '50M',
  'lr-schedule',
  1.567,
  1.489,
  'WSD warmup with peak LR 6e-4, batch size 64 -> 128 midway through training',
  80,
  15,
  63,
  2,
  4.98,
  'https://placeholder.supabase.co/storage/v1/object/public/run-files/h1/r2/results.tsv',
  'https://placeholder.supabase.co/storage/v1/object/public/run-files/h1/r2/train.py',
  'train.py'
);

-- Run 3: Carol submits a run on the trading hypothesis, forked from nobody
INSERT INTO public.runs (
  id, hypothesis_id, user_id,
  goal, hardware, time_budget, model_size,
  tag_1,
  baseline_metric, best_metric, best_description,
  num_experiments, num_kept, num_discarded, num_crashed,
  improvement_pct,
  results_tsv_url, code_file_url, code_filename
)
VALUES (
  'r3000000-0000-0000-0000-000000000003',
  'h2000000-0000-0000-0000-000000000002',
  'c3000000-0000-0000-0000-000000000003',
  'RSI + MACD hybrid signal with adaptive thresholds evolved by agent',
  '1x CPU',
  '10 min',
  'N/A',
  'momentum',
  0.80,
  1.23,
  'RSI(14) cross with MACD histogram sign change, adaptive threshold at 35/65',
  60,
  12,
  45,
  3,
  53.75,
  'https://placeholder.supabase.co/storage/v1/object/public/run-files/h2/r3/results.tsv',
  'https://placeholder.supabase.co/storage/v1/object/public/run-files/h2/r3/strategy.py',
  'strategy.py'
);

-- Run 4: Bob forks Alice's run on the LLM hypothesis
INSERT INTO public.runs (
  id, hypothesis_id, user_id,
  goal, hardware, time_budget, model_size,
  tag_1,
  forked_from,
  baseline_metric, best_metric, best_description,
  num_experiments, num_kept, num_discarded, num_crashed,
  improvement_pct,
  results_tsv_url, code_file_url, code_filename
)
VALUES (
  'r4000000-0000-0000-0000-000000000004',
  'h1000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000002',
  'Forked GQA config and tested SwiGLU activation with wider FFN',
  '1x A100 80GB',
  '5 min',
  '50M',
  'activation',
  'r1000000-0000-0000-0000-000000000001',
  1.423,
  1.391,
  'SwiGLU activation with 2.67x FFN width ratio, kept GQA 8 KV heads from fork',
  95,
  18,
  75,
  2,
  2.25,
  'https://placeholder.supabase.co/storage/v1/object/public/run-files/h1/r4/results.tsv',
  'https://placeholder.supabase.co/storage/v1/object/public/run-files/h1/r4/train.py',
  'train.py'
);

-- --------------------------------------------------------------------------
-- 5. Experiments (sample rows for Run 1)
-- --------------------------------------------------------------------------

INSERT INTO public.experiments (run_id, sequence, commit_hash, metric_value, memory_gb, status, description)
VALUES
  ('r1000000-0000-0000-0000-000000000001', 1,  'baseline', 1.567000, 12.3, 'keep',    'Baseline GPT-2 50M with standard MHA and RoPE'),
  ('r1000000-0000-0000-0000-000000000001', 2,  'a1b2c3d',  1.559000, 12.4, 'keep',    'Reduced number of layers from 12 to 10, increased width to 832'),
  ('r1000000-0000-0000-0000-000000000001', 3,  'e4f5g6h',  1.572000, 12.1, 'discard', 'Switched to ALiBi positional encoding'),
  ('r1000000-0000-0000-0000-000000000001', 4,  'i7j8k9l',  0.000000,  0.0, 'crash',   'Tried flash attention v3 — CUDA OOM with batch size 128'),
  ('r1000000-0000-0000-0000-000000000001', 5,  'm0n1o2p',  1.545000, 11.9, 'keep',    'GQA with 8 KV heads, 12 query heads'),
  ('r1000000-0000-0000-0000-000000000001', 6,  'q3r4s5t',  1.548000, 12.0, 'discard', 'GQA with 4 KV heads — too few'),
  ('r1000000-0000-0000-0000-000000000001', 7,  'u6v7w8x',  1.540000, 11.8, 'keep',    'Added cosine schedule with 50-step warmup'),
  ('r1000000-0000-0000-0000-000000000001', 8,  'y9z0a1b',  1.538000, 11.7, 'discard', 'Cosine with 200-step warmup — no improvement over 50'),
  ('r1000000-0000-0000-0000-000000000001', 9,  'c2d3e4f',  1.501000, 11.9, 'keep',    'Increased LR to 6e-4 with GQA config'),
  ('r1000000-0000-0000-0000-000000000001', 10, 'g5h6i7j',  1.498000, 12.0, 'discard', 'LR 8e-4 — slightly worse, more unstable'),
  ('r1000000-0000-0000-0000-000000000001', 11, 'k8l9m0n',  1.475000, 12.1, 'keep',    'SwiGLU activation replacing GELU'),
  ('r1000000-0000-0000-0000-000000000001', 12, 'o1p2q3r',  1.423000, 12.3, 'keep',    'Switched to GQA with 8 KV heads, cosine schedule with 100-step warmup');

-- Sample experiments for Run 3 (trading)
INSERT INTO public.experiments (run_id, sequence, commit_hash, metric_value, memory_gb, status, description)
VALUES
  ('r3000000-0000-0000-0000-000000000003', 1,  'baseline', 0.800000, 0.5, 'keep',    'Baseline SMA 20/50 crossover'),
  ('r3000000-0000-0000-0000-000000000003', 2,  'a2b3c4d',  0.720000, 0.5, 'discard', 'Added RSI filter — worse during trending markets'),
  ('r3000000-0000-0000-0000-000000000003', 3,  'e5f6g7h',  0.000000, 0.0, 'crash',   'Division by zero in position sizing with zero volatility window'),
  ('r3000000-0000-0000-0000-000000000003', 4,  'i8j9k0l',  0.950000, 0.5, 'keep',    'MACD histogram sign change as primary signal'),
  ('r3000000-0000-0000-0000-000000000003', 5,  'm1n2o3p',  1.050000, 0.5, 'keep',    'Combined RSI + MACD with fixed thresholds 30/70'),
  ('r3000000-0000-0000-0000-000000000003', 6,  'q4r5s6t',  1.230000, 0.5, 'keep',    'RSI(14) cross with MACD histogram sign change, adaptive threshold at 35/65');
