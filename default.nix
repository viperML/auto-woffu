let
  sources = import ./npins;
  pkgs = import sources.nixpkgs { };
  inherit (pkgs) lib;
  src = lib.cleanSource ./.;
  pnpm = pkgs.pnpm_10;
  package-json = builtins.fromJSON (builtins.readFile ./package.json);
  pname = package-json.name;
  version = package-json.version;
in
lib.fix (self: {
  shell = pkgs.mkShellNoCC {
    packages = [
      pkgs.nodejs
      pnpm
      pkgs.hclfmt
    ];
  };

  package = pkgs.stdenv.mkDerivation {
    inherit pname version src;
    nativeBuildInputs = [
      pkgs.nodejs
      pnpm.configHook
      # pkgs.npmHooks.npmInstallHook
      pkgs.makeWrapper
    ];

    installPhase = ''
      runHook preInstall

      mkdir -p $out/opt/${pname}
      cp -r . $out/opt/${pname}

      mkdir -p $out/bin
      makeWrapper ${lib.getExe pkgs.nodejs} $out/bin/${pname} \
        --prefix NODE_PATH : "$out/opt/${pname}/node_modules" \
        --inherit-argv0 \
        --add-flags "$out/opt/${pname}/dist/index.js"

      runHook postInstall
    '';

    pnpmDeps = pnpm.fetchDeps {
      inherit pname version src;
      fetcherVersion = 2;
      hash =
        {
          "aa6533f2fc98de5d4da97892818011f5bd693ca8" = "sha256-2po7NcLoTC8ekxiU5v6PFE+F6qKVbhpm3lVrqXRyVOk=";
        }
        .${builtins.hashFile "sha1" ./pnpm-lock.yaml};
    };
  };

  streamImage = pkgs.dockerTools.streamLayeredImage {
    name = pname;
    tag = "latest";
    contents = [ self.package ];
    config = {
      Cmd = [ "/bin/auto-woffu" ];
      Env = [ "NODE_ENV=production" ];
    };
  };
})
