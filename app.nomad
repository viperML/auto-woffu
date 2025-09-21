variable "tag" {
  type    = string
  default = "ghcr.io/viperml/auto-woffu:553e0001e9382e655c323513888eed566a49bc7b"
}

job "auto-woffu" {
  datacenters = ["dc1"]

  group "group" {
    task "main" {
      driver = "docker"

      resources {
        cpu    = 100
        memory = 64
      }

      config {
        image = var.tag
        command = "run"
        mounts = [
          {
            type   = "volume"
            target = "/mnt"
            source = "woffu"
          }
        ]
      }

      env {
        WOFFU_ENV_FILE = "/mnt/env"
      }
    }
  }
}
