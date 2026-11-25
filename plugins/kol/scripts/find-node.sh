# Sourced by the kol plugin's bin/ wrappers. Hooks and status lines start without a login shell, so `node`
# may not be on PATH (nvm, Homebrew). kol_find_node prints the first usable node, or nothing:
#   $KOL_NODE, node on PATH, the node the plugin last ran with (<Kol home>/line-node, saved by kol-line),
#   Homebrew, /usr/local, nvm (current link, else the newest installed), Volta, asdf, fnm, /usr/bin.
kol_find_node() {
  kol_home=${KOL_CC_HOME:-$HOME/.kol}
  saved=$(cat "$kol_home/line-node" 2>/dev/null)
  nvm_dir=${NVM_DIR:-$HOME/.nvm}
  for n in "${KOL_NODE:-}" "$(command -v node 2>/dev/null)" "$saved" /opt/homebrew/bin/node /usr/local/bin/node \
    "$nvm_dir/current/bin/node" "$HOME/.volta/bin/node" "$HOME/.asdf/shims/node" \
    "$HOME/Library/Application Support/fnm/aliases/default/bin/node" "$HOME/.local/share/fnm/aliases/default/bin/node" \
    "$HOME/.local/bin/node" /usr/bin/node; do
    if [ -n "$n" ] && [ -x "$n" ]; then
      printf '%s\n' "$n"
      return 0
    fi
  done
  best=""
  best_major=0
  for n in "$nvm_dir"/versions/node/v*/bin/node; do
    [ -x "$n" ] || continue
    v=${n%/bin/node}
    v=${v##*/v}
    major=${v%%.*}
    case $major in '' | *[!0-9]*) continue ;; esac
    if [ "$major" -gt "$best_major" ]; then
      best=$n
      best_major=$major
    fi
  done
  [ -n "$best" ] && printf '%s\n' "$best"
}
