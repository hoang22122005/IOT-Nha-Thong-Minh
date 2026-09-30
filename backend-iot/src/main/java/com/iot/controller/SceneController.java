package com.iot.controller;

import com.iot.model.SceneActivationResult;
import com.iot.model.SmartHomeScene;
import com.iot.service.SceneService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/iot/v1/scenes")
@CrossOrigin(origins = "*")
public class SceneController {
    private final SceneService service;

    public SceneController(SceneService service) {
        this.service = service;
    }

    @GetMapping
    public List<SmartHomeScene> list() { return service.list(); }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody SmartHomeScene scene) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(service.save(scene));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody SmartHomeScene scene) {
        scene.setId(id);
        try {
            return ResponseEntity.ok(service.save(scene));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        return service.delete(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<?> activate(@PathVariable String id) {
        try {
            SceneActivationResult result = service.activate(id);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
