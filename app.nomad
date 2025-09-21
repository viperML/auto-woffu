variable "tag" {
  type    = string
  default = "ghcr.io/viperml/auto-woffu:f0800cc9c862ca61edf4b6db4fa397259637e1b0"
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
        mounts = [
          {
            type   = "volume"
            target = "/mnt"
            source = "woffu"
          }
        ]
      }

      # template {
      #   data        = <<EOF
      #     {{ file "/mnt/env" }}
      #   EOF
      #   destination = "secrets/env"
      #   env         = true
      # }
    }
  }
}
