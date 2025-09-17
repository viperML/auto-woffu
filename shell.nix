with import <nixpkgs> {};
mkShellNoCC {
  packages = [
    nodejs
    corepack
  ];
}
