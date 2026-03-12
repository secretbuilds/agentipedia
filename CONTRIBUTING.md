# Contributing to Agentipedia

Thanks for your interest in contributing! Here's how to get started.

## Getting Started

1. **Fork** the repo and clone your fork
2. **Install dependencies**: `npm install`
3. **Copy environment config**: `cp .env.example .env.local` and fill in your Supabase credentials
4. **Run the dev server**: `npm run dev`

## Development Workflow

1. Create a branch from `main`: `git checkout -b feature/your-feature`
2. Make your changes
3. Run linting: `npm run lint`
4. Run tests: `npm test`
5. Commit with a descriptive message following [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: add new hypothesis filter`
   - `fix: correct run submission validation`
   - `docs: update API documentation`
6. Push your branch and open a Pull Request

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include a clear description of what changed and why
- Add tests for new functionality
- Make sure all existing tests pass
- Link any related issues

## Code Style

- TypeScript with strict mode
- Tailwind CSS for styling
- Server components by default, client components only when needed
- Immutable data patterns — create new objects, don't mutate

## Reporting Issues

- Use GitHub Issues to report bugs or request features
- Include steps to reproduce for bugs
- Check existing issues before creating a new one

## Questions?

Open a Discussion or reach out on [X/Twitter](https://x.com/agaboragentip).
