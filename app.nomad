variable "tag" {
  type    = string
  default = "ghcr.io/viperml/auto-woffu"
}

job "auto-woffu" {
  datacenters = ["dc1"]

  group "group" {
    task "main" {
      driver = "docker"

      config {
        image = var.tag
      }

      resources {
        cpu    = 100
        memory = 64
      }

      config {
        mounts = [
          {
            type   = "volume"
            target = "/mnt"
            source = "woffu"
          }
        ]
      }

      templater {
        data        = <<EOF
          {{ file "/mnt/env" }}
        EOF
        destination = "env"
      }
    }
  }
}
