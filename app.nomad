variable "tag" {
  type    = string
  default = "ghcr.io/viperml/auto-woffu"
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
        image   = var.tag
        command = "auto-woffu"
        args    = ["run"]
        mounts = [
          {
            type   = "volume"
            target = "/mnt"
            source = "woffu"
          }
        ]
      }

      env {
        AUTOWOFFU_ENV_FILE = "/mnt/env"
      }
    }
  }
}
