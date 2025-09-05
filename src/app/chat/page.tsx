'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { StompSubscription } from '@stomp/stompjs';
import api from '../utils/api';
import styles from './chat.module.css';
import { useRouter } from 'next/navigation';

// --- 타입 정의 ---
interface ChatMessage {
    content: string;
    senderId: string;
    senderName: string;
    recipientId: string;
    createdAt: string;
}
interface ChatUser {
    userid: string;
    username: string;
    userRole: string;
}
type OnlineUserMap = Record<string, string>;


export default function ChatPage() {
    const { user, isAuthenticated, stompClient } = useAuth(); // 전역 stompClient를 가져옵니다.
    const router = useRouter();

    const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [onlineUsers, setOnlineUsers] = useState<OnlineUserMap>({});
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    // 최초 데이터 로딩 useEffect
    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        const fetchInitialData = async () => {
            try {
                const allUsersResponse = await api.get<ChatUser[]>('/api/users');
                setAllUsers(allUsersResponse.data.filter(u => u.userid !== user?.id));
                const onlineUsersResponse = await api.get<OnlineUserMap>('/api/chat/online-users');
                setOnlineUsers(onlineUsersResponse.data);
            } catch (e) {
                console.error("Failed to fetch initial chat data", e);
            }
        };
        fetchInitialData();
    }, [isAuthenticated, router, user]);

    // WebSocket 구독 전용 로직
    useEffect(() => {
        if (!stompClient || !stompClient.connected || !user) {
            return;
        }
        
        const subscriptions: StompSubscription[] = [];

        subscriptions.push(
            stompClient.subscribe(`/user/${user.id}/queue/private`, (message) => {
                const receivedMessage: ChatMessage = JSON.parse(message.body);
                if (selectedUser && receivedMessage.senderId === selectedUser.userid) {
                    setMessages(prev => [...prev, receivedMessage]);
                } else {
                    alert(`새 메시지 도착: ${receivedMessage.senderName}`);
                }
            })
        );

        subscriptions.push(
            stompClient.subscribe('/topic/onlineUsers', (message) => {
                const updatedOnlineUsers: OnlineUserMap = JSON.parse(message.body);
                setOnlineUsers(updatedOnlineUsers);
            })
        );

        return () => {
            subscriptions.forEach(sub => sub.unsubscribe());
        };

    }, [stompClient, user, selectedUser]);

    // 대화 내역 불러오기
    useEffect(() => {
        const fetchHistory = async () => {
            if (selectedUser && user) {
                try {
                    const response = await api.get<ChatMessage[]>(`/api/chat/history/${user.id}/${selectedUser.userid}`);
                    setMessages(response.data);
                } catch (e) { console.error("Failed to fetch chat history", e); }
            }
        };
        fetchHistory();
    }, [selectedUser, user]);

    // 자동 스크롤
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 메시지 전송 핸들러
    const handleSendMessage = () => {
        if (chatInput && stompClient && user && selectedUser) {
            const message: Omit<ChatMessage, 'createdAt'> = {
                content: chatInput,
                senderId: user.id,
                senderName: user.username,
                recipientId: selectedUser.userid,
            };

            stompClient.publish({
                destination: '/app/chat.privateMessage',
                body: JSON.stringify(message)
            });

            setMessages(prev => [...prev, { ...message, createdAt: new Date().toISOString() }]);
            setChatInput('');
        }
    };

    // ▼▼▼ [수정] 비어있던 JSX 렌더링 부분을 복원했습니다 ▼▼▼
    return (
        <div className={styles.chatLayout}>
            <aside className={styles.userSidebar}>
                <div className={styles.sidebarHeader}><h3>대화 상대</h3></div>
                <ul className={styles.userList}>
                    {allUsers.map(chatUser => (
                        <li key={chatUser.userid}
                            className={`${styles.userItem} ${selectedUser?.userid === chatUser.userid ? styles.selected : ''}`}
                            onClick={() => setSelectedUser(chatUser)}>
                            
                            <span className={`${styles.statusIndicator} ${onlineUsers[chatUser.userid] ? styles.online : styles.offline}`}></span>
                            
                            {chatUser.username} ({chatUser.userRole})
                        </li>
                    ))}
                </ul>
            </aside>

            <main className={styles.chatWindow}>
                {selectedUser ? (
                    <>
                        <header className={styles.chatHeader}><h2>{selectedUser.username}</h2></header>
                        <div className={styles.messageArea}>
                            {messages.map((msg, index) => (
                                <div key={index} className={`${styles.messageBubble} ${msg.senderId === user?.id ? styles.sent : styles.received}`}>
                                    <p>{msg.content}</p>
                                    <span className={styles.timestamp}>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <footer className={styles.chatInputArea}>
                            <input type="text" placeholder="메시지를 입력하세요..."
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleSendMessage()} />
                            <button onClick={handleSendMessage}>전송</button>
                        </footer>
                    </>
                ) : (
                    <div className={styles.placeholder}><p>대화 상대를 선택하세요.</p></div>
                )}
            </main>
        </div>
    );
}