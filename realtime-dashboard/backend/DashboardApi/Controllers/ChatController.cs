using DashboardApi.Data;
using DashboardApi.Data.Models;
using DashboardApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DashboardApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly ClaudeService _claude;
    private readonly AppDbContext  _db;

    public ChatController(ClaudeService claude, AppDbContext db)
    {
        _claude = claude;
        _db     = db;
    }

    /// <summary>
    /// Sends a question + chart data to Claude and returns the AI answer.
    /// POST /api/chat/ask
    /// </summary>
    [HttpPost("ask")]
    public async Task<IActionResult> Ask([FromBody] AskRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Question))
            return BadRequest(new { error = "Question is required." });

        // Get or create session
        var session = await GetOrCreateSessionAsync(req.SessionId);

        // Persist user message
        _db.ChatMessages.Add(new ChatMessage
        {
            SessionId = session.Id,
            Role      = "user",
            Content   = req.Question
        });
        await _db.SaveChangesAsync();

        // Call Claude
        var answer = await _claude.AskAsync(
            req.Question,
            req.ChartDataJson,
            HttpContext.RequestAborted);

        // Persist assistant reply
        _db.ChatMessages.Add(new ChatMessage
        {
            SessionId = session.Id,
            Role      = "assistant",
            Content   = answer
        });
        await _db.SaveChangesAsync();

        return Ok(new { answer, sessionId = session.Id.ToString() });
    }

    /// <summary>
    /// Returns chat history for a session.
    /// GET /api/chat/history/{sessionId}
    /// </summary>
    [HttpGet("history/{sessionId:guid}")]
    public IActionResult GetHistory(Guid sessionId)
    {
        var messages = _db.ChatMessages
            .Where(m => m.SessionId == sessionId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new { m.Role, m.Content, m.CreatedAt });

        return Ok(messages);
    }

    private async Task<ChatSession> GetOrCreateSessionAsync(string? id)
    {
        if (Guid.TryParse(id, out var guid))
        {
            var existing = await _db.ChatSessions.FindAsync(guid);
            if (existing != null) return existing;
        }

        var session = new ChatSession { UserId = 1 };
        _db.ChatSessions.Add(session);
        await _db.SaveChangesAsync();
        return session;
    }
}

public record AskRequest(
    string  Question,
    string  ChartDataJson,
    string? SessionId);
