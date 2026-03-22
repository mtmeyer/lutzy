# Development Practices

## General

- Don't use single letter variable names, 3 letter abbreviations are ok (e.g `ctx` instead of `context`)
- Follow existing formatting and linting patterns
- Follow established patterns already used in the codebase and documentation

### Philosophy

1. **Clarity over Cleverness** - Predictable patterns over magic
2. **Performance by Design** - Patterns that prevent common performance pitfalls
3. **Security First** - Built-in security patterns for file system operations
4. **Extensible Foundation** - Easy to add new features without refactoring

## SolidJS

- This project uses `npm`, NOT `pnpm`. Always use `npm install`, `npm run`, etc.
- Don't destructure props/state, this breaks the reactivity model
- Use Solid's elements like <Show /> and <For /> to handle JSX logic
    - Using early returns in the component for alternative JSX breaks the 
    reactivity model


## Rust

- Use Tauri V2 docs only
